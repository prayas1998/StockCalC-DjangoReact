import { handle } from 'hono/vercel';
import app from './index';
// Vercel function adapter for deployment
export default handle(app);
