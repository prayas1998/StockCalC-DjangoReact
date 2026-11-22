import { Context } from 'hono';
import { calculationRequestSchema } from '../validators/schemas.js';
import { EquityCalculator } from '../calculations/equity.js';

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
        
        const { platform, exchange, tradeType, transactions, positionType, tradeDate, growwDpRate } = validatedData;
        const calculator = new EquityCalculator(platform, exchange, tradeType, { tradeDate, growwDpRate });
        const result = calculator.calculate_transaction_charges(transactions, positionType);

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
