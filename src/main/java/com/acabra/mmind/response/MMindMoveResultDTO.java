package com.acabra.mmind.response;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import lombok.Getter;
import lombok.NonNull;

import java.util.Arrays;
import java.util.Objects;

@Builder(setterPrefix = "with")
@Getter
public class MMindMoveResultDTO {
    private final String playerName;
    private final int index;
    private final char[] guess;
    private final int fixes;
    private final int spikes;
    private final long id;

    @JsonCreator
    public MMindMoveResultDTO(@JsonProperty("playerName") String playerName, @JsonProperty("index") int index,
                              @JsonProperty("guess") char[] guess,
                              @JsonProperty("fixes") int fixes, @JsonProperty("spikes") int spikes,
                              @JsonProperty("id") long id) {
        this.index = index;
        this.fixes = fixes;
        this.spikes = spikes;
        this.guess = guess;
        this.playerName = playerName;
        this.id = id;
    }
}
