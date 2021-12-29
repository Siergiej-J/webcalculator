package com.acabra.mmind.response;

import com.acabra.calculator.response.SimpleResponse;
import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import lombok.Getter;

@Getter
public class MMindJoinRoomResponse extends SimpleResponse {

    private static final long serialVersionUID = 7872620661672847103L;
    private final String token;
    private final String roomPassword;
    private final Long roomNumber;
    private final Long playerId;
    private final String action;
    private final String userName;
    private final String opponentName;

    @JsonCreator
    @Builder(setterPrefix = "with")
    private MMindJoinRoomResponse(@JsonProperty("id") long id, @JsonProperty("failure") boolean failure,
                                  @JsonProperty("token") String token, @JsonProperty("roomPassword") String roomPassword,
                                  @JsonProperty("roomNumber") Long roomNumber,
                                  @JsonProperty("playerId") Long playerId,
                                  @JsonProperty("action") String action,
                                  @JsonProperty("userName") String userName,
                                  @JsonProperty("opponentName") String opponentName) {
        super(id, failure);
        this.token = token;
        this.roomPassword = roomPassword;
        this.roomNumber = roomNumber;
        this.playerId = playerId;
        this.action = action;
        this.userName = userName;
        this.opponentName = opponentName;
    }
}
