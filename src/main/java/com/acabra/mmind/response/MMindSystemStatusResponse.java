package com.acabra.mmind.response;

import com.acabra.calculator.response.SimpleResponse;
import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
public class MMindSystemStatusResponse extends SimpleResponse {

    private final List<MMindSystemStatusRoomDTO> rooms;
    private final List<MMindTokenInfoDTO> tokens;

    @Builder(setterPrefix = "with")
    @JsonCreator
    protected MMindSystemStatusResponse(@JsonProperty("id")  long id, @JsonProperty("failure") boolean failure,
                                        @JsonProperty("rooms")  List<MMindSystemStatusRoomDTO> rooms,
                                        @JsonProperty("rooms")  List<MMindTokenInfoDTO> tokens) {
        super(id, failure);
        this.rooms = rooms;
        this.tokens = tokens;
    }
}
