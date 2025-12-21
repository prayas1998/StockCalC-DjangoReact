import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { requestLogger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { authMiddleware } from './middleware/auth';
import { rateLimitMiddleware } from './middleware/rateLimit';
import config from './config';
import { calcRoutes } from './routes/calculator';
import { profileRoutes } from './routes/profile';
import { authRoutes } from './routes/auth';
import { journalRoutes } from './routes/journal';

// Initialize Hono app
const app = new Hono();

// CORS middleware
app.use('/*', cors({
  origin: config.api.corsOrigins,
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with'
  ]
}));

// Health check (no auth required, before auth middleware)
app.get('/api/health-check/', (c) => {
  console.log('Health check accessed');
  return c.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Global middleware (order matters)
app.use('/*', requestLogger);
app.use('/*', authMiddleware);
app.use('/*', rateLimitMiddleware);
app.use('/*', errorHandler);

// API routes - register all routes from route modules
calcRoutes.forEach(route => {
  if (route.method === 'POST') {
    app.post(route.path, route.handler as any);
  }
});

profileRoutes.forEach(route => {
  if (route.method === 'GET') {
    app.get(route.path, route.handler as any);
  } else if (route.method === 'PATCH') {
    app.patch(route.path, route.handler as any);
  } else if (route.method === 'POST') {
    app.post(route.path, route.handler as any);
  } else if (route.method === 'DELETE') {
    app.delete(route.path, route.handler as any);
  }
});

authRoutes.forEach(route => {
  if (route.method === 'POST') {
    app.post(route.path, route.handler as any);
  } else if (route.method === 'GET') {
    app.get(route.path, route.handler as any);
  }
});

journalRoutes.forEach(route => {
  if (route.method === 'GET') {
    app.get(route.path, route.handler as any);
  } else if (route.method === 'POST') {
    app.post(route.path, route.handler as any);
  } else if (route.method === 'PATCH') {
    app.patch(route.path, route.handler as any);
  } else if (route.method === 'DELETE') {
    app.delete(route.path, route.handler as any);
  }
});

// Root endpoint
app.get('/', (c) => {
  return c.text('API is running fine!');
});

// 404 handler
app.notFound((c) => {
  console.warn(`404 - Route not found: ${c.req.method} ${c.req.url}`);
  return c.json({
    error: true,
    error_id: `nf_${Date.now()}`,
    category: 'not_found' as const,
    message: 'The requested resource was not found'
  }, 404);
});

// Global error handler (fallback)
app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json({
    error: true,
    error_id: `ue_${Date.now()}`,
    category: 'server_error' as const,
    message: 'An internal server error occurred. Please try again later.'
  }, 500);
});

export default app;