package com.acabra.calculator.request;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Created by Agustin on 9/28/2016.
 */
@JsonIgnoreProperties(ignoreUnknown=true)
public class IntegralRequestDTO implements SimpleRequest {

    private String lowerBound;
    private String upperBound;
    private String numberThreads;
    private String repeatedCalculations;
    private int functionId;
    private boolean areaInscribed;
    private int approximationMethodId;

    public IntegralRequestDTO() {
    }

    public IntegralRequestDTO(String lowerBound, String upperBound, String numberThreads, String repeatedCalculations, int functionId, int approximationMethodId, boolean areaInscribed) {
        this.lowerBound = lowerBound;
        this.upperBound = upperBound;
        this.numberThreads = numberThreads;
        this.repeatedCalculations = repeatedCalculations;
        this.functionId = functionId;
        this.approximationMethodId = approximationMethodId;
        this.areaInscribed = areaInscribed;
    }

    @JsonProperty("lowerBound")
    public String getLowerBound() {
        return lowerBound;
    }

    @JsonProperty("upperBound")
    public String getUpperBound() {
        return upperBound;
    }

    @JsonProperty("numberThreads")
    public String getNumberThreads() {
        return numberThreads;
    }

    @JsonProperty("repeatedCalculations")
    public String getRepeatedCalculations() {
        return repeatedCalculations;
    }

    @JsonProperty("functionId")
    public int getFunctionId() {
        return functionId;
    }

    @JsonProperty("areaInscribed")
    public boolean isAreaInscribed() {
        return areaInscribed;
    }

    @JsonProperty("approximationMethodId")
    public int getApproximationMethodId() {
        return approximationMethodId;
    }
}
