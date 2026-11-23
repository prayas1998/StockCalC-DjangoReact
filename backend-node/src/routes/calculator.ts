import { Context } from 'hono';
import { calculationRequestSchema } from '../validators/schemas.js';
import { EquityDeliveryCalculator } from '../calculations/equityDelivery.js';
import { EquityIntradayCalculator } from '../calculations/equityIntraday.js';

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
          // Django parity: unsupported trade type returns a 400 with an `error` string.
          return c.json({ error: `Unsupported trade type: ${tradeType}` }, 400);
        }
        
        // Calculate charges
        const result = calculator.calculate_transaction_charges(
          validatedData.transactions, 
          validatedData.positionType || 'long'
        );
        
        // Django parity: even "soft" calculator errors are returned as a JSON body (200 OK).
        return c.json(result, 200);
        
      } catch (error) {
        const detail = error instanceof Error ? error.message : 'Unknown error';
        // Django parity: invalid input returns a 400 with `error` and `detail`.
        return c.json({ error: 'Invalid input data', detail }, 400);
      }
    }
  }
];
