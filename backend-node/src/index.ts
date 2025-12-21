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

// Simple health check only
app.get('/api/health-check/', (c) => {
  console.log('Health check accessed');
  return c.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Root endpoint
app.get('/', (c) => {
  return c.text('API is running fine!');
});

export default app;

// Start the server
const port = process.env.PORT || 8000;
console.log(`Starting server on port ${port}...`);

// Try using Node.js HTTP server directly
import { createServer } from 'http';

const server = createServer(app.fetch);

server.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});