import { Context } from 'hono';
import { requireAuth } from '../middleware/auth.js';
import { calculationRequestSchema } from '../validators/schemas.js';
import { CalculationRequest, CalculationResponse } from '../types/index.js';
import { EquityDeliveryCalculator } from '../calculations/equityDelivery.js';
import { EquityIntradayCalculator } from '../calculations/equityIntraday.js';
import { BreakevenCalculator } from '../calculations/breakevenCalculator.js';
import { DecimalUtils } from '../calculations/index.js';

export const calcRoutes = [
  {
    method: 'POST' as const,
    path: '/api/calculate/',
    handler: async (c: Context) => {
      try {
        const rawBody = await Promise.race([
          c.req.text(),
          new Promise<string>((_, reject) => {
            setTimeout(() => reject(new Error('Request body read timeout')), 5000);
          })
        ]);

        const body = JSON.parse(rawBody);
        const validatedData = calculationRequestSchema.parse(body);
        
        // Get appropriate calculator
        let calculator;
        const { platform, exchange, tradeType } = validatedData;
        
        if (tradeType === 'equity-delivery') {
          calculator = new EquityDeliveryCalculator(platform, exchange, tradeType);
        } else if (tradeType === 'equity-intraday') {
          calculator = new EquityIntradayCalculator(platform, exchange, tradeType);
        } else {
          return c.json({
            error: true,
            error_id: `calc_${Date.now()}`,
            category: 'validation' as const,
            message: `Trade type '${tradeType}' is not supported`
          }, 400);
        }
        
        // Calculate charges
        const result = calculator.calculate_transaction_charges(
          validatedData.transactions, 
          validatedData.positionType || 'long'
        );
        
        // Check for errors
        if (result && typeof result === 'object' && 'error' in result) {
          return c.json({
            error: true,
            error_id: `calc_${Date.now()}`,
            category: 'validation' as const,
            message: result.error
          }, 400);
        }
        
        return c.json(result, 200);
        
      } catch (error) {
        if (error instanceof Error && error.message === 'Request body read timeout') {
          return c.json({
            error: true,
            error_id: `calc_${Date.now()}`,
            category: 'validation' as const,
            message: 'Request body read timed out'
          }, 408);
        }
        return c.json({
          error: true,
          error_id: `calc_${Date.now()}`,
          category: 'validation' as const,
          message: 'Invalid calculation request data'
        }, 400);
      }
    }
  }
];