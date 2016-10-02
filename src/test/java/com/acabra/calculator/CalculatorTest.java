package com.acabra.calculator;

import com.acabra.calculator.integral.IntegralSolver;
import com.acabra.calculator.integral.ExponentialIntegral;
import com.acabra.calculator.integral.IntegrableFunction;
import com.acabra.calculator.integral.PolynomialIntegral;
import com.acabra.calculator.util.WebCalculatorConstants;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.powermock.api.mockito.PowerMockito;
import org.powermock.core.classloader.annotations.PowerMockIgnore;
import org.powermock.core.classloader.annotations.PrepareForTest;
import org.powermock.modules.junit4.PowerMockRunner;

import java.util.*;
import java.util.concurrent.CompletableFuture;

import static org.junit.Assert.assertEquals;
import static org.mockito.Matchers.anyString;
import static org.mockito.Matchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.internal.verification.VerificationModeFactory.times;
import static org.powermock.api.mockito.PowerMockito.*;

/**
 * Created by Agustin on 9/30/2016.
 */
@RunWith(PowerMockRunner.class)
@PrepareForTest({Calculator.class, IntegralSolver.class, ShuntingYard.class})
@PowerMockIgnore(value = {"javax.management.*"})
public class CalculatorTest {

    Calculator calculator = new Calculator();

    @Test
    public void solveExponentialIntegralExpression() throws Exception {
        double expected = 1.71828;
        CompletableFuture<IntegrableFunction> concurrentIntegralResult = CompletableFuture.completedFuture(new ExponentialIntegral(0, 1, expected));

        IntegralSolver integralSolverMock = PowerMockito.mock(IntegralSolver.class);

        whenNew(IntegralSolver.class).withAnyArguments().thenReturn(integralSolverMock);
        when(integralSolverMock.approximateSequenceRiemannArea(true)).thenReturn(concurrentIntegralResult);
        IntegrableFunction integrableFunction = calculator.resolveIntegralApproximateRiemannSequenceRequest(null).get();

        assertEquals(expected, integrableFunction.getResult(), 0.00001);

        verifyNew(IntegralSolver.class).withArguments(eq(null));
        verify(integralSolverMock, times(1));
    }

    @Test
    public void solvePolynomialIntegralExpression() throws Exception {
        double expected = 1.71828;
        double[] coefficients = {0, 2};
        CompletableFuture<IntegrableFunction> concurrentIntegralResult =
                CompletableFuture.completedFuture(new PolynomialIntegral(0, 1, 2, coefficients, Optional.of(expected)));

        IntegralSolver integralSolverMock = PowerMockito.mock(IntegralSolver.class);

        whenNew(IntegralSolver.class).withAnyArguments().thenReturn(integralSolverMock);
        when(integralSolverMock.approximateSequenceRiemannArea(true)).thenReturn(concurrentIntegralResult);
        IntegrableFunction integrableFunction = calculator.resolveIntegralApproximateRiemannSequenceRequest(null).get();

        assertEquals(expected, integrableFunction.getResult(), 0.00001);

        verifyNew(IntegralSolver.class).withArguments(eq(null));
        verify(integralSolverMock, times(1));
    }

    @Test
    public void solveArithmeticExpression() throws Exception {
        String expr = "1 + 2 + 3";
        List<String> postFixExpressionList = Arrays.asList("1 2 3 + +".split("\\s+"));
        double result = 6;

        PowerMockito.mockStatic(ShuntingYard.class);
        when(ShuntingYard.postfix(anyString())).thenReturn(postFixExpressionList);

        Double calculatorResult = calculator.solveArithmeticExpression(expr);

        verifyStatic(times(1));

        assertEquals(result, calculatorResult, WebCalculatorConstants.ACCURACY_EPSILON);

    }

    @Test
    public void solveInFixExpression1Test() {
        String expression = "1 + 2 + 3 - 4 + 8";
        double expected = 10;
        List<String> postFixExpressionList = Arrays.asList("1 2 + 3 4 - + 8 +".split("\\s+"));

        PowerMockito.mockStatic(ShuntingYard.class);
        when(ShuntingYard.postfix(anyString())).thenReturn(postFixExpressionList);

        Double actual = calculator.solveArithmeticExpression(expression);

        verifyStatic(times(1));

        assertEquals(expected, actual, WebCalculatorConstants.ACCURACY_EPSILON);

    }

    @Test
    public void solveInFixExpression2Test() {
        String expression = "2 sqrt ( 9 ) * 5";
        double expected = 30;
        List<String> postFixExpressionList = Arrays.asList("2 9 @ 5 *".split("\\s+"));

        PowerMockito.mockStatic(ShuntingYard.class);
        when(ShuntingYard.postfix(anyString())).thenReturn(postFixExpressionList);

        Double actual = calculator.solveArithmeticExpression(expression);

        verifyStatic(times(1));

        assertEquals(expected, actual, WebCalculatorConstants.ACCURACY_EPSILON);
    }

    @Test
    public void solveInFixExpression3Test() {
        String expression = "2  + sqrt ( 9 )";
        double expected = 5;
        List<String> postFixExpressionList = Arrays.asList("2 9 @ +".split("\\s+"));

        PowerMockito.mockStatic(ShuntingYard.class);
        when(ShuntingYard.postfix(anyString())).thenReturn(postFixExpressionList);

        Double actual = calculator.solveArithmeticExpression(expression);

        verifyStatic(times(1));

        assertEquals(expected, actual, WebCalculatorConstants.ACCURACY_EPSILON);
    }

    @Test
    public void solveInFixExpression4Test() {
        String expression = "1 + 2 * ( 3 - 4 ) + 8 / ( 1 + 1 )";
        double expected = 3;
        List<String> postFixExpressionList = Arrays.asList("1 2 3 4 - * + 8 1 1 + / +".split("\\s+"));

        PowerMockito.mockStatic(ShuntingYard.class);
        when(ShuntingYard.postfix(anyString())).thenReturn(postFixExpressionList);

        Double actual = calculator.solveArithmeticExpression(expression);

        verifyStatic(times(1));

        assertEquals(expected, actual, WebCalculatorConstants.ACCURACY_EPSILON);
    }

    @Test(expected = InputMismatchException.class)
    public void solveInFixExpressionInvalid1Test() {
        String expression = "1 + 2 *  ) ( 3 - 4 ) + 8 / ( 1 + 1 )";

        PowerMockito.mockStatic(ShuntingYard.class);
        when(ShuntingYard.postfix(anyString())).thenThrow(NoSuchElementException.class);

        calculator.solveArithmeticExpression(expression);
    }

    @Test
    public void solveInFixExpressionPosInfiniteTest() {
        String expression = "6 / 0";
        double expected = Double.POSITIVE_INFINITY;
        List<String> postFixExpressionList = Arrays.asList("6 0 /".split("\\s+"));

        PowerMockito.mockStatic(ShuntingYard.class);
        when(ShuntingYard.postfix(anyString())).thenReturn(postFixExpressionList);

        Double actual = calculator.solveArithmeticExpression(expression);

        verifyStatic(times(1));

        assertEquals(expected, actual, WebCalculatorConstants.ACCURACY_EPSILON);
    }

    @Test
    public void solveInFixExpressionNegInfiniteTest() {
        String expression = "-6 / 0";
        double expected = Double.NEGATIVE_INFINITY;
        List<String> postFixExpressionList = Arrays.asList("-6 0 /".split("\\s+"));

        PowerMockito.mockStatic(ShuntingYard.class);
        when(ShuntingYard.postfix(anyString())).thenReturn(postFixExpressionList);

        Double actual = calculator.solveArithmeticExpression(expression);

        verifyStatic(times(1));

        assertEquals(expected, actual, WebCalculatorConstants.ACCURACY_EPSILON);
    }

    @Test
    public void solveInFixExpressionNaNTest() {
        String expression = "0 / 0";
        double expected = Double.NaN;
        List<String> postFixExpressionList = Arrays.asList("0 0 /".split("\\s+"));

        PowerMockito.mockStatic(ShuntingYard.class);
        when(ShuntingYard.postfix(anyString())).thenReturn(postFixExpressionList);

        Double actual = calculator.solveArithmeticExpression(expression);

        verifyStatic(times(1));

        assertEquals(expected, actual, WebCalculatorConstants.ACCURACY_EPSILON);
    }
}
