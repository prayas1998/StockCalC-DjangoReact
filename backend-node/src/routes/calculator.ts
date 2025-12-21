import { Context } from 'hono';
import { requireAuth } from '../middleware/auth';
import { calculationRequestSchema } from '../validators/schemas';
import { CalculationRequest, CalculationResponse } from '../types';
import { EquityDeliveryCalculator } from '../calculations/equityDelivery';
import { EquityIntradayCalculator } from '../calculations/equityIntraday';
import { BreakevenCalculator } from '../calculations/breakevenCalculator';
import { DecimalUtils } from '../calculations/index';

export const calcRoutes = [
  {
    method: 'POST' as const,
    path: '/api/calculate/',
    handler: async (c: Context) => {
      const body = await c.req.json();
      
      try {
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