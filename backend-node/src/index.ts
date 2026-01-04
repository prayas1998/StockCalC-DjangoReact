import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { requestLogger } from './utils/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authMiddleware } from './middleware/auth.js';
import { rateLimitMiddleware } from './middleware/rateLimit.js';
import config from './config.js';
import { calcRoutes } from './routes/calculator.js';
import { profileRoutes } from './routes/profile.js';
import { authRoutes } from './routes/auth.js';
import { journalRoutes } from './routes/journal.js';
import type { Context } from 'hono';

type RouteDef = {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  path: string;
  handler: (c: Context) => Promise<Response> | Response;
};

// Initialize Hono app
const app = new Hono();

// Global middleware (order matters)
app.use('*', errorHandler);
app.use(
  '*',
  cors({
    origin: (origin) => {
      if (!origin) return undefined;
      const isAllowed = config.api.corsOrigins.some((allowed) => {
        if (typeof allowed === 'string') {
          return origin === allowed;
        }
        if (allowed instanceof RegExp) {
          return allowed.test(origin);
        }
        return false;
      });
      return isAllowed ? origin : undefined;
    },
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  })
);
app.use('*', requestLogger);
app.use('*', authMiddleware);
app.use('*', rateLimitMiddleware);

const registerRoutes = (routes: RouteDef[]) => {
  for (const route of routes) {
    const method = route.method.toLowerCase();
    (app as any)[method](route.path, route.handler);
  }
};

// API routes
registerRoutes(calcRoutes);
registerRoutes(profileRoutes);
registerRoutes(authRoutes);
registerRoutes(journalRoutes);

// Simple health check only
app.get('/api/health-check/', (c) => {
  console.log('Health check accessed');
  return c.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Root endpoint
app.get('/', (c) => {
  return c.text('API is running fine!');
});

// Export for Vercel deployment
export default app;
