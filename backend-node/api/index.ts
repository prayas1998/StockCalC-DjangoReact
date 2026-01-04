import { handle } from '@hono/node-server/vercel';
import app from '../dist/index.js';

const handler = handle(app);

// Vercel parses JSON into req.body; ensure rawBody exists for Hono adapter.
export default function vercelHandler(req: any, res: any) {
  if (!req.rawBody && req.body) {
    const bodyText = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    req.rawBody = Buffer.from(bodyText);
  }
  return handler(req, res);
}
