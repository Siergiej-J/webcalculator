package com.acabra.calculator.domain;

/**
 * Created by Agustin on 9/30/2016.
 */
public class IntegralRequest {

    private final double lowerBound;
    private final double upperBound;
    private final int repeatedCalculations;
    private final int numThreads;
    private final int functionId;

    public IntegralRequest(double lowerBound, double upperBound, int repeatedCalculations, int numThreads, int functionId) {
        this.lowerBound = lowerBound;
        this.upperBound = upperBound;
        this.repeatedCalculations = repeatedCalculations;
        this.numThreads = numThreads;
        this.functionId = functionId;
    }

    public double getLowerBound() {
        return lowerBound;
    }

    public double getUpperBound() {
        return upperBound;
    }

    public int getRepeatedCalculations() {
        return repeatedCalculations;
    }

    public int getNumThreads() {
        return numThreads;
    }

    public int getFunctionId() {
        return functionId;
    }

    public static class IntegralRequestBuilder {

        private double lowerBound;
        private double upperBound;
        private int repeatedCalculations;
        private int numThreads;
        private int functionId;

        public IntegralRequestBuilder() {
        }

        public IntegralRequestBuilder withLowerBound(double lowerBound) {
            this.lowerBound = lowerBound;
            return this;
        }

        public IntegralRequestBuilder withUpperBound(double upperBound) {
            this.upperBound = upperBound;
            return this;
        }

        public IntegralRequestBuilder withRepeatedCalculations(int repeatedCalculations) {
            this.repeatedCalculations = repeatedCalculations;
            return this;
        }

        public IntegralRequestBuilder withNumThreads(int numThreads) {
            this.numThreads = numThreads;
            return this;
        }

        public IntegralRequestBuilder withFunctionId(int functionId) {
            this.functionId = functionId;
            return this;
        }

        public IntegralRequest build() {
            return new IntegralRequest(lowerBound, upperBound, repeatedCalculations, numThreads, functionId);
        }
    }
}