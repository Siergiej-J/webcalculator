package com.acabra.mmind;

import com.acabra.mmind.auth.MMindTokenInfo;
import com.acabra.mmind.core.*;
import com.acabra.mmind.request.MMindJoinRoomRequestDTO;
import com.acabra.mmind.request.MMindRequestDTO;
import com.acabra.mmind.request.MMindRestartRequest;
import com.acabra.mmind.response.*;
import com.acabra.mmind.utils.B64Helper;
import com.acabra.mmind.utils.TimeDateHelper;
import lombok.extern.slf4j.Slf4j;

import java.util.*;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

@Slf4j
public class MMindRoomsAdministrator {
    private static final String ADM_PWD = System.getenv("admpwd");
    private final Map<Long, MMindRoom> rooms;
    private final Map<String, MMindTokenInfo> auth;


    private MMindRoomsAdministrator() {
        this.rooms = new HashMap<>();
        this.auth = new HashMap<>();
    }

    private MMindAuthResponse joinRoomAsGuest(MMindJoinRoomRequestDTO request, MMindRoom room, String password) {
        String token = UUID.randomUUID().toString();
        MMindPlayer player = new MMindPlayer(request.getPlayerName(), request.getSecret(), token);
        auth.put(token, MMindTokenInfo.builder()
                        .withAdminToken(false)
                        .withRoomNumber(room.getRoomNumber())
                        .withToken(token)
                        .withExpiresAfter(newTokenExpiration())
                .build());
        room.getManager().addGuest(player);
        return MMindAuthResponse.builder()
                .withToken(token)
                .withRoomPassword(password)
                .withRoomNumber(room.getRoomNumber())
                .withAction(MMindAuthAction.JOIN_GUEST)
                .build();
    }

    private long newTokenExpiration() {
        return System.currentTimeMillis() + TimeUnit.MINUTES.toMillis(30);
    }

    private MMindAuthResponse createRoomAsAdmin(MMindJoinRoomRequestDTO joinRoomRequest, long roomNumber) {
        String token = UUID.randomUUID().toString();
        long expiresAfter = newTokenExpiration();
        logger.info("--------------->>> Created room {} expires after:{}" , roomNumber, TimeDateHelper.fromEpoch(expiresAfter));
        auth.put(token, MMindTokenInfo.builder()
                .withAdminToken(true)
                .withRoomNumber(roomNumber)
                .withToken(token)
                .withExpiresAfter(expiresAfter)
                .build());
        MMindPlayer player = new MMindPlayer(joinRoomRequest.getPlayerName(), joinRoomRequest.getSecret(), token);
        MMindRoom room = MMindRoom.builder()
                .withRoomNumber(roomNumber)
                .withManager(MMindGameManager.newGame(player))
                .withExpiresAfter(expiresAfter)
                .build();
        rooms.put(room.getRoomNumber(), room);
        return MMindAuthResponse.builder()
                .withToken(token)
                .withRoomPassword(room.getPassword())
                .withRoomNumber(room.getRoomNumber())
                .withAction(MMindAuthAction.JOIN_ADMIN)
                .build();
    }

    private boolean isAdminPassword(String password) {
        return ADM_PWD.equals(B64Helper.decode(password));
    }

    private boolean isAdminToken(String token) {
        MMindTokenInfo tokenInfo = auth.get(token);
        return tokenInfo != null && tokenInfo.isAdminToken();
    }

    public static MMindRoomsAdministrator of() {
        return new MMindRoomsAdministrator();
    }

    private MMindAuthResponse authenticate(MMindJoinRoomRequestDTO request) {
        long roomNumber = request.getRoomNumber();
        MMindRoom room = rooms.get(roomNumber);
        boolean admin = isAdminPassword(request.getPassword());
        if(null == room) {
            if(admin) {
                return createRoomAsAdmin(request, roomNumber);
            }
            throw new NoSuchElementException("Unable to locate given room: " + roomNumber);
        }
        String password = B64Helper.decode(request.getPassword());
        if(admin) {
            return MMindAuthResponse.builder()
                    .withToken(room.getManager().retrieveHostToken())
                    .withRoomPassword(password)
                    .withRoomNumber(room.getRoomNumber())
                    .withAction(MMindAuthAction.NONE)
                    .build();
        }
        if(password.equals(room.getPassword())) {
            if((room.getManager().awaitingGuest())) {
                return joinRoomAsGuest(request, room, password);
            } else if(room.getManager().isCurrentGuest(request)) {
                return MMindAuthResponse.builder()
                        .withToken(request.getToken())
                        .withRoomPassword(password)
                        .withRoomNumber(room.getRoomNumber())
                        .withAction(MMindAuthAction.NONE)
                        .build();
            }
            throw new UnsupportedOperationException("Room is full");
        }
        throw new UnsupportedOperationException("Invalid Room Password!");
    }

    public synchronized MMindGameManager findRoomManager(MMindRequestDTO req) {
        MMindTokenInfo tokenInfo = auth.get(req.getToken());
        if(tokenInfo == null || tokenInfo.getRoomNumber() != req.getRoomNumber()) {
            throw new UnsupportedOperationException("Unable to attend call for given room: " + req.getRoomNumber());
        }
        return rooms.get(req.getRoomNumber()).getManager();
    }

    public synchronized MMindStatusResponse getStatus(long id, String token, long roomNumber) {
        MMindTokenInfo tokenInfo = auth.get(token);
        if(tokenInfo == null || tokenInfo.getRoomNumber() != roomNumber) {
            throw new UnsupportedOperationException("Unable to attend call for given room: " + roomNumber);
        }
        MMindGameManager manager = rooms.get(roomNumber).getManager();
        MMindHistoryItem lastHistoryItem = manager.getLastHistoryItem();
        MMindStatusEventType eventType = manager.calculateEventType(token);
        MMindMoveResultDTO lastMove = lastHistoryItem != null ?
                MMindResultMapper.toResultDTO(lastHistoryItem.getMoveResult()) : null;
        return MMindStatusResponse.builder()
                .withId(id)
                .withFailure(false)
                .withEventType(eventType.toString())
                .withLastMove(lastMove)
                .withOpponentName(manager.getOpponentsName(token))
                .withIsOwnMove(lastHistoryItem != null ? token.equals(lastHistoryItem.getPlayerToken()) : null)
                .withResult(MMindStatusEventType.GAME_OVER_EVT == eventType ? manager.provideEndResult() : null)
                .build();
    }

    public synchronized void clean() {
        long now = System.currentTimeMillis();
        List<String> expiredTokens = auth.values().stream()
                .filter(tokenInfo -> tokenInfo.getExpiresAfter() >= now)
                .map(MMindTokenInfo::getToken)
                .collect(Collectors.toList());
        expiredTokens.forEach(auth::remove);
        List<Long> expiredRooms = rooms.values().stream()
                .filter(room -> room.getExpiresAfter() >= now)
                .map(MMindRoom::getRoomNumber)
                .collect(Collectors.toList());
        expiredRooms.forEach(rooms::remove);
        logger.info("Cleanup Report Rooms:{} Tokens:{}", expiredRooms.size(), expiredTokens.size());
    }

    public synchronized MMindSystemStatusResponse reviewSystemStatus(long id, String token) {
        if(isAdminToken(token)) {
            return MMindResultMapper.toSystemStatusResponse(id, new ArrayList<>(rooms.values()), auth);
        }
        throw new UnsupportedOperationException("Unauthorized: Unable to perform request");
    }

    public synchronized MMindJoinRoomResponse getAuthenticateResponse(long id, MMindJoinRoomRequestDTO request) {
        final MMindAuthResponse authResponse = authenticate(request);
        return MMindJoinRoomResponse.builder()
                .withId(id)
                .withFailure(false)
                .withToken(authResponse.getToken())
                .withAction(authResponse.getAction().toString())
                .withRoomPassword(B64Helper.encode(authResponse.getRoomPassword()))
                .withRoomNumber(authResponse.getRoomNumber())
                .withUserName(request.getPlayerName())
                .build();
    }

    public synchronized MMindRestartResponse processRestartRequest(long id, MMindRestartRequest req) {
        final MMindTokenInfo tokenInfo = auth.get(req.getToken());
        if(tokenInfo != null) {
            final MMindRoom room = rooms.get(tokenInfo.getRoomNumber());
            if(room == null) {
                return MMindRestartResponse.builder()
                        .withId(id)
                        .withFailure(true)
                        .withAction(MMindRestartAction.CHANGE_ROOM.toString())
                        .build();
            }
            final MMindGameManager manager = room.getManager();
            if(tokenInfo.isAdminToken()) {
                auth.put(req.getToken(), tokenInfo.renew());
                rooms.put(room.getRoomNumber(), room.restartGame(manager.newManager(req.getSecret())));
                return MMindRestartResponse.builder()
                        .withId(id)
                        .withFailure(false)
                        .withAction(MMindRestartAction.AWAIT_GUEST.toString())
                        .withSecret(req.getSecret())
                        .build();
            }
            if(manager.isGameOver()) {
                return MMindRestartResponse.builder()
                        .withId(id)
                        .withFailure(false)
                        .withAction(MMindRestartAction.AWAIT_HOST.toString())
                        .build();
            }
            if (manager.awaitingGuest()) {
                auth.put(req.getToken(), tokenInfo.renew());
                manager.addGuestWithNewSecret(req.getToken(), req.getSecret());
                return MMindRestartResponse.builder()
                        .withId(id)
                        .withFailure(false)
                        .withSecret(req.getSecret())
                        .withAction(MMindRestartAction.AWAIT_MOVE.toString())
                        .build();
            }
        }
        return MMindRestartResponse.builder()
                .withId(id)
                .withFailure(true)
                .withAction(MMindRestartAction.CHANGE_ROOM.toString())
                .build();
    }
}
