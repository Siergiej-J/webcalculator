"use strict";

let token = !localStorage.getItem('sessid') ? null : localStorage.getItem('sessid');
let roomNumberStr = localStorage.getItem('room_number');
let playerIdStr = window.localStorage.getItem('player_id');
const AVAILABLE_DIGITS = '0123456789';
const SECRET_LENGTH = 4;

let Main = (function () {
    function FixSpike() {
        return {
            SendNumber: function (guess) {
                let q = $.Deferred();
                window.localStorage.removeItem('sequence_response_id');
                function buildMoveResult(success, action) {
                    return {
                        success: success,
                        action: action
                    };
                }

                $.ajax({
                    cache: false,
                    type: "POST",
                    url: encodeURI('/api/fsands/submit'),
                    data: JSON.stringify({
                        token: token,
                        roomNumber: roomNumberStr,
                        guess: guess
                    }),
                    contentType: "application/json; charset=utf-8",
                    dataType: "json"
                }).done(function (res) {
                    if (!res.failure) {
                        renderer.updateUserHistory(res.moveResult);
                        window.localStorage.setItem('lastConsumedEventId', res.moveResult.id);
                        q.resolve(buildMoveResult(true, 'AWAIT_MOVE'));
                    } else {
                        q.resolve(buildMoveResult(false, 'NO_ACT'));
                    }
                }).fail(function (jqhxr, errorText, type) {
                    console.log(errorText);
                    if(jqhxr.responseJSON.error.indexOf('Invalid length for given secret') > 0) {
                        $('#guess_value').css('border-color', 'red');
                        alerts.showError('Invalid secret', 3000);
                        q.resolve(buildMoveResult(false, 'NO_ACT'));
                    } else if(jqhxr.responseJSON.error.indexOf('Not your turn') > 0) {
                        $('#guess_value').css('border-color', 'red');
                        alerts.showError('not your turn', 3000);
                        q.resolve(buildMoveResult(false, 'NO_ACT'));
                    } else if(jqhxr.responseJSON.error.indexOf('Restart required: opponent left') > 0) {
                        $('#guess_value').css('border-color', 'red');
                        alerts.showError('your opponent has left the game ... please restart', 5000);
                        q.resolve(buildMoveResult(false, 'RESTART_ACT'));
                    }
                });
                return q.promise();
            }
        };
    }

    function Renderer() {
        function addColorGuess(fixes, spikes) {
            return fixes === 4 ? 'status_guess_winner' : spikes === 4 || fixes === 3 ? 'status_guess_close' : '';
        }

        function swapLastMoveToFooterSection(tableBodyElm, tableSelector) {
            let row = tableBodyElm.children('tr:first');
            let tableFooterElm = $(tableSelector + ' tfoot');
            let footRow = $('<tr style="text-align: center">');
            row.children().each(function (idx, td) {
                let tdElm = $(td);
                let footCol = (idx === 0) ? $('<th>').addClass('index_column') : $('<td>');
                footCol.text(tdElm.text())
                footRow.append(footCol);
            });
            row.remove();
            tableFooterElm.prepend(footRow);
        }

        function appendHistory(tableSelector, moveResult, includeIndex, swapLastMoveToFooter) {
            let node = $('<tr style="text-align: center">');
            let guess = moveResult.guess;
            if(includeIndex) {
                let index_column = $('<th>');
                index_column.html(moveResult.index);
                index_column.addClass('index_column');
                node.append(index_column)
            }
            let colorGuess = addColorGuess(moveResult.fixes, moveResult.spikes);
            for (let i = 0; i < guess.length; ++i) {
                let column = $('<td>');
                column.addClass(colorGuess);
                column.html(guess.charAt(i));
                node.append(column);
            }
            let resultColumn = $('<td style="text-align: center">');
            resultColumn.addClass(colorGuess);
            let fixesNode = $('<span>');
            fixesNode.html('<b>F:</b>' + moveResult.fixes + '&nbsp;');
            resultColumn.append(fixesNode);
            let spikesNode = $('<span>');
            spikesNode.html('<b>S:</b>' + moveResult.spikes);
            resultColumn.append(spikesNode);

            node.append(resultColumn);
            let tableBodySelector = tableSelector + ' tbody';
            let tableBodyElm = $(tableBodySelector);
            if(swapLastMoveToFooter) {
                swapLastMoveToFooterSection(tableBodyElm, tableSelector);
            }
            node.addClass('last_added_row');
            setTimeout(function() {
                node.removeClass('last_added_row');
            }, 3000);
            tableBodyElm.prepend(node);
        }

        let updateUserHistory = function (move) {
            console.log('updating view');
            appendHistory('#user_table', move, true, false);
        };

        let updateOpponentsMove = function (move) {
            console.log('update opponent\'s move');
            appendHistory('#opponent_table', move, true, true);
        };

        let drawRoomTokenInformation = function (tokenInfo) {
            let tokenInfoColumn = $('<td>');
            if (!tokenInfo) return tokenInfoColumn;
            let tokenInfoElm = $('<ul>');
            tokenInfoElm.append($('<li>').html(tokenInfo.token));
            tokenInfoElm.append($('<li>').html(tokenInfo.expiresAfter));
            tokenInfoElm.append($('<li>').html('admin:' + tokenInfo.isAdmin));
            tokenInfoElm.append($('<li>').html('roomNumber' + tokenInfo.roomNumber));
            tokenInfoColumn.append(tokenInfoElm);
            return tokenInfoColumn;
        }

        function buildRowTokenInformation(tokenInfo, idx) {
            if (!tokenInfo) return '';
            let row = $('<tr id="token_row_' + idx +'">');
            row.append($('<td>').html(tokenInfo.token));
            row.append($('<td>').html(tokenInfo.expiresAfter));
            row.append($('<td>').html(tokenInfo.isAdmin));
            row.append($('<td>').html(tokenInfo.roomNumber));
            if(token !== tokenInfo.token) {
                let buttonElm = $('<button id="remove_token_' + idx +'" class="btn btn-danger">');
                buttonElm.html('X');
                buttonElm.click(function () {
                    let tokenId = tokenInfo.token;
                    console.log('deleting token: ' + tokenId);
                    $.ajax({
                        cache: false,
                        type: "DELETE",
                        url: encodeURI('/api/fsands/token'),
                        data: JSON.stringify({
                            tokenToDelete: tokenId,
                            userToken: token
                        }),
                        contentType: "application/json; charset=utf-8",
                        dataType: "json"
                    }).done(function (res){
                        if(!res.failure) {
                            row.remove();
                        } else {
                            alerts.showError('unable to remove token', 1000);
                        }
                    }).fail(function (jqhxr, text, type) {
                        alerts.showError('unable to remove token, it is in active use', 2000);
                    });
                })
                row.append($('<td style="text-align: center">').append(buttonElm));
            } else {
                row.append($('<td style="text-align: center">').html('--'));
            }
            return row;
        }

        function drawDeleteRoomButton(roomNumber, rowId) {
            let deleteBtnElm = $('<button>');
            deleteBtnElm.addClass('btn btn-danger btn-sm');
            deleteBtnElm.html('X');
            deleteBtnElm.click(function (){
                $.ajax({
                    cache: false,
                    type: "DELETE",
                    url: encodeURI('/api/fsands/room'),
                    data: JSON.stringify({
                        roomNumber: roomNumber,
                        token: token
                    }),
                    contentType: "application/json; charset=utf-8",
                    dataType: "json"
                }).done(function (res) {
                    if(!res.failure) {
                        $('#' + rowId).remove();
                    } else {
                        alerts.showError(res.message, 3000);
                    }
                }).fail(function (jqhxr, error, type) {
                    alerts.showError(jqhxr.responseJSON.message, 3000);
                });
            })
            return deleteBtnElm;
        }

        let drawSystemInfoTable = function (resp) {
            let rooms = resp.rooms;
            let adminStats = $('#admin_stats');
            if(rooms && rooms.length > 0) {

                let tableBody = $('#admin_stats_rooms_table tbody');
                tableBody.html('');
                rooms.forEach(function (room, idx) {
                    let rowId = 'room_row' + idx;
                    let row = $('<tr id="' + rowId + '">');

                    let columnNumber = $('<td>');
                    columnNumber.html(room.number);
                    row.append(columnNumber);

                    let roomExpiresAfterColumn = $('<td>');
                    roomExpiresAfterColumn.html(room.expiresAfter);
                    row.append(roomExpiresAfterColumn)

                    row.append(drawRoomTokenInformation(room.hostToken));
                    row.append(drawRoomTokenInformation(room.guestToken));
                    row.append($('<td style="text-align: center">').append(drawDeleteRoomButton(room.number, rowId)));
                    tableBody.append(row);
                });
                adminStats.show();
            }
            let tokens = resp.tokens;
            if(tokens) {
                let tableTokenBody = $('#admin_stats_tokens_table tbody');
                tableTokenBody.html('');
                tokens.forEach(function (token) {
                    tableTokenBody.append(buildRowTokenInformation(token));
                });
            }
        };
        let renderOpponentName = function (opponentName) {
            if(!opponentName) return;
            let opponentLabelElm = $('#opponent_username');
            if('[Opponent]' === opponentLabelElm.html() || opponentLabelElm.html() !== opponentName) {
                opponentLabelElm.html(opponentName);
            }
        };

        let guessSelectFunction = function () {
            let str = '';
            for (let i = 0; i < SECRET_LENGTH; ++i) {
                str += $('#digit_index_' + i).val();
            }
            $('#guess_value').val(str);
            $('#btn_guess_surrogate').click();
        };

        function drawGuessSelectButton(f) {
            let btn = $('<button>');
            btn.prop('disabled', true);
            btn.prop('id', 'btn_guess');
            btn.html('GO');
            btn.click(f);
            return btn;
        }

        function drawSelectElement(idx) {
            let selectElm = $('<select>');
            selectElm.prop('id', 'digit_index_' + idx);
            selectElm.addClass('form-select');
            for (let i = 0; i < AVAILABLE_DIGITS.length; ++i) {
                let opt = $('<option>');
                opt.prop('id', AVAILABLE_DIGITS.charAt(i))
                opt.html(AVAILABLE_DIGITS.charAt(i));
                selectElm.append(opt);
            }
            selectElm.val(AVAILABLE_DIGITS.charAt(0));
            return selectElm;
        }

        let renderSelectRow = function () {
            let rowElm = $('<tr>');
            rowElm.prop('id', 'select_number_row');
            rowElm.append($('<td>').addClass('index_column'));
            for (let i = 0; i < SECRET_LENGTH; ++i) {
                rowElm.append($('<td>').append(drawSelectElement(i)))
            }
            let btnElm = drawGuessSelectButton(guessSelectFunction);
            rowElm.append($('<td>').append(btnElm));
            $('#user_table thead').append(rowElm);
        };

        let showAllOpponentMoves = function () {
            let opponentTable = $('#opponent_table tfoot');
            opponentTable.toggle();
            $('#guess_value').focus();
        };
        let animateSecretVar = null;

        function decorateUndecorate(opponentsSecretElm, cls, addClass) {
            opponentsSecretElm.children().each(function (idx, td) {
                if (idx >= 1 && idx <= 4) {
                    if (addClass) {
                        $(td).addClass(cls);
                    } else {
                        $(td).removeClass();
                    }
                }
            });
        }

        function flickerResult(jqElm, cls, addClass) {
            decorateUndecorate(jqElm, cls, addClass);
            animateSecretVar = setTimeout(function(){
                flickerResult(jqElm, cls, !addClass);
            }, 1500);
        }

        let animateOpponentsSecret = function (opponentSecret, cls) {
            let opponentsSecretElm = $('#user_number_guess');
            opponentsSecretElm.children().each(function (idx, td) {
                if(idx >= 1 && idx <= 4) {
                    let child = $(td);
                    child.html(opponentSecret.charAt(idx-1));
                    child.addClass(cls);
                }
            });
            flickerResult(opponentsSecretElm, cls, false);
        };

        let drawQuestionMarksForOpponentsSecret = function() {
            let opponentsSecretElm = $('#user_number_guess');
            opponentsSecretElm.html('');
            opponentsSecretElm.append($('<th class="index_column">').text('#'))
                .append($('<th>').text('?'))
                .append($('<th>').text('?'))
                .append($('<th>').text('?'))
                .append($('<th>').text('?'))
                .append($('<th style="text-align: center">').text('Res'));
        }

        let getResultDecorationClass = function (result) {
            if(result === -1 || result === parseInt(playerIdStr, 10)) {
                return 'winner_result_cls'
            }
            return 'loser_result_cls';
        };

        let enableRestart = function () {
            let buttonGuessElm = $('#btn_guess');
            buttonGuessElm.prop('disabled', true);
            buttonGuessElm.removeClass();
            $('#guess_section').hide();

            let btnRestartElm = $('#btn_restart');
            btnRestartElm.prop('disabled', false);
            btnRestartElm.addClass('btn btn-primary');
            $('#restart_section').show();
        };
        return {
            updateUserHistory: updateUserHistory,
            updateOpponentsMove: updateOpponentsMove,
            drawSystemInfoTable: drawSystemInfoTable,
            renderOpponentName: renderOpponentName,
            cleanWinnerBanner: function () {
                let gameResultElm = $('#game_result');
                gameResultElm.fadeOut(1500);
                gameResultElm.removeClass();
                $('#game_result_label').html('');
            },
            cleanMoves: function () {
                $('#user_table tbody').html('');
                $('#opponent_table tbody').html('');
                $('#opponent_table tfoot').html('');
            },
            renderOwnSecret: function (secret) {
                secret = secret ? secret : localStorage.getItem('ownsecret');
                let targetRow = $('#opponent_number_guess');
                targetRow.html('');
                targetRow.append($('<th>').addClass('index_column').html('#'));
                for (let i = 0; i < secret.length; ++i) {
                    let child = $('<th>');
                    child.html(secret.charAt(i));
                    targetRow.append(child);
                }
                targetRow.append($('<th style="text-align: center">').html('Res'));
            },
            renderSelectRow: renderSelectRow,
            resetGuessRow: function () {
                for (let i = 0; i <SECRET_LENGTH; ++i) {
                    $('#digit_index_'+i).val(AVAILABLE_DIGITS.charAt(0));
                }
            },
            showAllOpponentMoves : showAllOpponentMoves,
            animateOpponentsSecret: animateOpponentsSecret,
            getResultDecorationClass: getResultDecorationClass,
            drawQuestionMarksForOpponentsSecret: drawQuestionMarksForOpponentsSecret,
            stopFlickerAnimation: function () {
                clearTimeout(animateSecretVar);
                animateSecretVar = null;
            },
            enableRestart: enableRestart
        };
    }

    let Alerts = function () {
        const CLS_MSG_TYPES = ['error_alert', 'your_move_alert', 'info_alert'];
        const ERROR_MSG_TYPE = 0;
        const YOUR_MOVE_MSG_TYPE = 1;
        const INFO_MSG_TYPE = 2;

        const opacity = 1500;
        const animationLength = 1500;

        let beep = function() {
            const BEEP_SOURCE = "data:audio/wav;base64,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qJrx4KOQjahZxWbcZgztj2c49nKmkId44S71j0c8eV9yDK6uPRzx5X18eDvjvQ6yKo9ZSS6l//8elePK/Lf//IInrOF/FvDoADYAGBMGb7FtErm5MXMlmPAJQVgWta7Zx2go+8xJ0UiCb8LHHdftWyLJE0QIAIsI+UbXu67dZMjmgDGCGl1H+vpF4NSDckSIkk7Vd+sxEhBQMRU8j/12UIRhzSaUdQ+rQU5kGeFxm+hb1oh6pWWmv3uvmReDl0UnvtapVaIzo1jZbf/pD6ElLqSX+rUmOQNpJFa/r+sa4e/pBlAABoAAAAA3CUgShLdGIxsY7AUABPRrgCABdDuQ5GC7DqPQCgbbJUAoRSUj+NIEig0YfyWUho1VBBBA//uQZB4ABZx5zfMakeAAAAmwAAAAF5F3P0w9GtAAACfAAAAAwLhMDmAYWMgVEG1U0FIGCBgXBXAtfMH10000EEEEEECUBYln03TTTdNBDZopopYvrTTdNa325mImNg3TTPV9q3pmY0xoO6bv3r00y+IDGid/9aaaZTGMuj9mpu9Mpio1dXrr5HERTZSmqU36A3CumzN/9Robv/Xx4v9ijkSRSNLQhAWumap82WRSBUqXStV/YcS+XVLnSS+WLDroqArFkMEsAS+eWmrUzrO0oEmE40RlMZ5+ODIkAyKAGUwZ3mVKmcamcJnMW26MRPgUw6j+LkhyHGVGYjSUUKNpuJUQoOIAyDvEyG8S5yfK6dhZc0Tx1KI/gviKL6qvvFs1+bWtaz58uUNnryq6kt5RzOCkPWlVqVX2a/EEBUdU1KrXLf40GoiiFXK///qpoiDXrOgqDR38JB0bw7SoL+ZB9o1RCkQjQ2CBYZKd/+VJxZRRZlqSkKiws0WFxUyCwsKiMy7hUVFhIaCrNQsKkTIsLivwKKigsj8XYlwt/WKi2N4d//uQRCSAAjURNIHpMZBGYiaQPSYyAAABLAAAAAAAACWAAAAApUF/Mg+0aohSIRobBAsMlO//Kk4soosy1JSFRYWaLC4qZBYWFRGZdwqKiwkNBVmoWFSJkWFxX4FFRQWR+LsS4W/rFRb/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////VEFHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAU291bmRib3kuZGUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMjAwNGh0dHA6Ly93d3cuc291bmRib3kuZGUAAAAAAAAAACU=";
            let snd = new Audio(BEEP_SOURCE);
            snd.play();
        };

        let showInfo = function (msg, durMillis, type) {
            let div = $("#general_information");
            $('#general_information_msg').html(msg);
            div.addClass(CLS_MSG_TYPES[type]);
            div.show();
            if(durMillis > 0) {
                div.fadeTo(durMillis, opacity).slideUp(animationLength, function () {
                    div.slideUp(animationLength);
                    div.removeClass();
                });
            }
        };

        function buildTextResult(result, opponentName) {
            if(result === -1) {
                return ['TIE &#x1F44A;', 'Kudos to both players!'];
            }
            if (result === parseInt(playerIdStr, 10)) {
                return ['You WON&#x1F389;&#x1F38A;!!', 'Congratulations &#x1F44F;'];
            }
            return [opponentName + ' won!!&#x1F613;', '... better luck next time'];
        }

        return {
            showError: function (msg, durationMillis) {
                showInfo(msg, durationMillis, ERROR_MSG_TYPE);
            },
            yourMove: function () {
                beep();
                showInfo('Your Turn!!!', 3000, YOUR_MOVE_MSG_TYPE);
            },
            showInfo: function (msg) {
                showInfo(msg, 3000, INFO_MSG_TYPE);
            },
            gameOver: function (result, opponentName, decoration_cls) {
                let gameResultElm = $('#game_result');
                let textResults = buildTextResult(result, opponentName);
                $('#game_result_label').html(textResults[0]);
                $('#game_result_message').html(textResults[1]);
                gameResultElm.addClass(decoration_cls);
                gameResultElm.show();
            }
        };
    };

    let fixSpike = FixSpike();
    let renderer = Renderer();
    let alerts = Alerts();

    let statusTimeoutVar = null;

    function drawLastMove(lastMove) {
        const lastConsumedEventIdKey = 'lastConsumedEventId';
        let lastConsumedEventId = parseInt(!window.localStorage.getItem(lastConsumedEventIdKey)
            ? '-1' : window.localStorage.getItem(lastConsumedEventIdKey), 10);
        if (lastMove && lastMove.id > lastConsumedEventId) {
            window.localStorage.setItem(lastConsumedEventIdKey, lastMove.id);
            if(lastMove.isOwnMove) {
                renderer.updateUserHistory(lastMove);
            } else {
                renderer.updateOpponentsMove(lastMove);
            }
        }
    }

    function executeGameOverEvent(response, gameStatus) {
        let values = gameStatus.gameOverValues;
        stopFunction(statusTimeoutVar);
        drawLastMove(response.lastMove);
        let decoration_cls = renderer.getResultDecorationClass(values.result);
        alerts.gameOver(values.result, response.opponentName, decoration_cls);
        renderer.animateOpponentsSecret(values.opponentSecret, decoration_cls);
        let guessBtn = $('#btn_guess');
        guessBtn.removeClass();
        guessBtn.prop('disabled', true);
        $('#guess_section').hide();
        let btnRestart = $('#btn_restart');
        btnRestart.prop('disabled', false);
        btnRestart.addClass('btn btn-primary');
        $('#restart_section').show();
        $('#new_secret_value').focus();
    }

    function executeMakeMoveEvent(response) {
        stopFunction(statusTimeoutVar);
        drawLastMove(response.lastMove);
        renderer.renderOpponentName(response.opponentName);
        let guessBtn = $('#btn_guess');
        guessBtn.addClass("btn btn-primary");
        guessBtn.prop('disabled', false);
        alerts.yourMove();
    }

    function executeRequestRestart() {
        stopFunction(statusTimeoutVar);
        alerts.showError('your opponent has left the room ... please restart', 5000);
        renderer.enableRestart();
    }

    function retrieveStatus() {
        let sequenceId = !!localStorage.getItem('sequence_response_id')
            ? parseInt(localStorage.getItem('sequence_response_id'),10)
            : -1;
        $.get({
            cache: false,
            url: encodeURI('/api/fsands/status?token=' + token + '&room='+ roomNumberStr + '&seq='+sequenceId)
        })
            .done(function (statusResponse) {
                let gameStatus = statusResponse.gameStatus;
                if(statusResponse.failure || sequenceId === statusResponse.sequenceId) {
                    return;
                }
                localStorage.setItem('sequence_response_id', statusResponse.sequenceId);
                if('GAME_OVER_STATE' === gameStatus.type) {
                    executeGameOverEvent(statusResponse, gameStatus);
                } else if('GAME_IN_PROGRESS_STATE' === gameStatus.type) {
                    if('MAKE_MOVE_ACT' === gameStatus.action) {
                        executeMakeMoveEvent(statusResponse);
                    } else if('RESTART_ACT' === gameStatus.action) {
                        executeRequestRestart();
                    }
                } else if('GAME_NOT_STARTED_STATE' === gameStatus.type) {
                    console.log(gameStatus.type  + '-'  + gameStatus.action);
                }
            })
            .fail(function (failedResponse) {
                console.log(
                    'failed to retrieve status: ' + failedResponse.statusText + ' please refresh (press F5) the page!');
                let responseText = failedResponse.responseText;
                if(responseText && failedResponse.responseText.indexOf('Unable to attend call for given room') > 0) {
                    stopFunction(statusTimeoutVar);
                }
            })
            .always(function () {
            });
    }

    let cycleRefresh = function () {
        retrieveStatus();
        statusTimeoutVar = setTimeout(cycleRefresh, 1300);
    };

    function stopFunction(id){
        clearTimeout(id);
    }

    let sendNumber = function (evt) {
        evt.preventDefault();
        if (token != null) {
            let guessBtn = $("#btn_guess");
            let guessVal = $('#guess_value');
            guessVal.css('border-color', '#e6e9ec');
            guessBtn.prop('disabled', true);
            if (guessVal.val() && guessVal.val().trim().length === SECRET_LENGTH) {
                let num = parseInt(guessVal.val());
                if (num >= 0 && num <= 9999) {
                    fixSpike.SendNumber(guessVal.val()).then(function (result) {
                        guessVal.val('');
                        if(result.success) {
                            guessBtn.removeClass();
                            cycleRefresh();
                        } else {
                            if(result.action === 'NO_ACT') {
                                guessBtn.prop('disabled', false);
                            } else if(result.action === 'RESTART_ACT') {
                                guessBtn.removeClass();
                                executeRequestRestart();
                            }
                        }
                    });
                } else {
                    alerts.showError("Invalid Guess: Only from 0000 to 9999", 1500);
                    guessBtn.prop('disabled', false);
                    guessVal.css('border-color', 'red');
                }
            } else {
                alerts.showError("Invalid Guess: Only from 0000 to 9999", 1500);
                guessBtn.prop('disabled', false);
                guessVal.css('border-color', 'red');
            }
        }
    };

    function cleanLocalStorage() {
        let cacheKeys = ['sessid', 'room_number', 'ownsecret', 'is_admin', 'lastConsumedEventId', 'player_id',
            'opponentName', 'sequence_response_id'];
        cacheKeys.forEach(function (key) {
            window.localStorage.removeItem(key);
        });
    }

    let restart = function (evt) {
        evt.preventDefault();
        renderer.stopFlickerAnimation();
        let btnRestart = $('#btn_restart');
        btnRestart.prop('disabled', true);

        const SECRET_KEY = 'ownsecret';
        const LAST_CONSUMED_EVT_ID_KEY = 'lastConsumedEventId';
        const SEQ_RESPONSE_KEY = 'sequence_response_id';

        renderer.cleanWinnerBanner();
        renderer.cleanMoves();
        let newSecretValue = $('#new_secret_value').val();
        let number = parseInt(newSecretValue, 10);
        if(newSecretValue.length !== SECRET_LENGTH || number > 9999 || number < 0) {
            alerts.showError('Secret must have ' + SECRET_LENGTH + ' digits');
            btnRestart.prop('disabled', false);
            return;
        }
        window.localStorage.setItem(SECRET_KEY, newSecretValue);
        window.localStorage.removeItem(LAST_CONSUMED_EVT_ID_KEY);
        window.localStorage.removeItem(SEQ_RESPONSE_KEY);

        $.ajax({
            cache: false,
            url : '/api/fsands/restart',
            type: 'POST',
            dataType : "json",
            data:  JSON.stringify({
                token: token,
                secret: newSecretValue
            }),
            headers: {
                'Content-Type': 'application/json'
            }
        }).done(function(res){
            btnRestart.removeClass();
            console.log('restart completed');
            let restartSectionElm  = $('#restart_section');
            restartSectionElm.removeClass();
            restartSectionElm.hide();
            renderer.drawQuestionMarksForOpponentsSecret();
            if ('AWAIT_GUEST' === res.action) {
                alerts.showInfo('Game starting soon, awaiting for guest...');
                $('#btn_guess').prop('disabled', true);
                renderer.renderOwnSecret(res.secret);
                $('#new_secret_value').val('');
                renderer.resetGuessRow();
                $('#guess_section').show();
                $('#guess_value').focus();
                cycleRefresh();
            } else if('AWAIT_MOVE' === res.action) {
                alerts.showInfo('Get Ready game has restarted ...', 5000);
                $('#btn_guess').prop('disabled', true);
                renderer.renderOwnSecret(res.secret);
                $('#new_secret_value').val('');
                renderer.resetGuessRow();
                $('#guess_section').show();
                $('#guess_value').focus();
                cycleRefresh();
            } else { // force room change
                alerts.showError('Room Expired ... please refresh the page (press F5)', 10000);
                cleanLocalStorage();
            }
        }).fail(function (jqhxr, errorText, type) {
            btnRestart.prop('disabled', false);
            alerts.showError('unable to restart: ' + errorText + ' ' + jqhxr.responseJSON.error);
        })

    };
    let exitRoom = async function (evt) {
        if(!token || !roomNumberStr) return;
        try {
            stopFunction(statusTimeoutVar);
            let result = await $.get({cache: false, url: encodeURI('/api/fsands/exit?token='+ token + '&room=' + roomNumberStr)})
                .done(function() {
                    console.log('exit reported to server');
                })
                .fail(function (){
                    console.log('failed to report exit to server');
                });
            return result;
        } catch (err) {
            console.log(err);
            return "";
        }
    };
    return {
        sendNumber: sendNumber,
        cycleRefresh: cycleRefresh,
        getRenderer: function () {
            return renderer;
        },

        updateSystemStats: function (resp) {
            if(!resp.failure) {
                renderer.drawSystemInfoTable(resp);
            }
        },
        restart: restart,
        exitRoom: exitRoom
    };
})();

$(document).ready(function () {
    if(!localStorage.getItem('ownsecret')) return;
    Main.getRenderer().renderOwnSecret();
    let storedOpponentName = window.localStorage.getItem('opponentName');
    if(storedOpponentName) {
        Main.getRenderer().renderOpponentName(storedOpponentName);
    }

    function isAdmin() {
        return window.localStorage.getItem('is_admin') === 'true';
    }

    if (!token) {
        window.alert('SORRY: we\'re unable to connect to the server please refresh the page...');
        return;
    }


    if(isAdmin()) {
        $('#admin_section').show();
        $('#get_stats_button').click(function() {
            let adminStatsElm = $('#admin_stats');
            if(adminStatsElm.is(':hidden')) {
                $.get({
                    cache: false,
                    url: encodeURI('/api/fsands/admin?token=' + token)
                }).done(function (resp) {
                        Main.updateSystemStats(resp)
                });
            } else {
                adminStatsElm.hide();
            }
        });
    }

    window.addEventListener("beforeunload", function(evt) {
        Main.exitRoom();
        return 'Your progress will be lost';
    });

    $('#guess_value').focus();
    $('#fsands_form').submit(Main.sendNumber);
    $('#fsands_restart_form').submit(Main.restart);
    $('#btn_show_all_opponent_moves').click(Main.getRenderer().showAllOpponentMoves);
    Main.cycleRefresh();
});