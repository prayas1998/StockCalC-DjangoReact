import { Hono } from 'hono';
import { handle } from 'hono/vercel';
import app from '../src/index';

// Vercel function adapter for deployment
export default handle(app);