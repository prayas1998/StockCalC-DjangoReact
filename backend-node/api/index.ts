import { handle } from '@hono/node-server/vercel';
import app from '../src/index.js';

// Vercel function adapter for deployment
export default handle(app);
