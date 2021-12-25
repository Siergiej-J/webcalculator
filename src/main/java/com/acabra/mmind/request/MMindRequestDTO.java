package com.acabra.mmind.request;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;

@Getter
@JsonIgnoreProperties(ignoreUnknown=true)
public class MMindRequestDTO {
    private final String token;
    private final long roomNumber;
    private final String guess;

    @JsonCreator
    public MMindRequestDTO(@JsonProperty("token") String token, @JsonProperty("roomNumber") long roomNumber,
                           @JsonProperty("guess") String guess) {
        this.token = token;
        this.roomNumber = roomNumber;
        this.guess = guess;
    }
}
