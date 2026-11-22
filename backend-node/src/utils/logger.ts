import { Context } from 'hono';
import { RequestContext } from '../types/index.js';

export const requestLogger = async (c: Context, next: () => Promise<void>) => {
  const start = Date.now();
  
  // Create request context
  const context: RequestContext = {
    ip: c.req.header('x-forwarded-for')?.split(',')[0] || c.req.header('x-real-ip') || 'unknown',
    userAgent: c.req.header('user-agent') || '',
    method: c.req.method,
    path: c.req.path,
    timestamp: new Date(),
    user: c.get('user') ? {
      id: c.get('userId') || c.get('user')?.id,
      email: c.get('user')?.email
    } : undefined
  };
  
  // Log request (only important info in production)
  const logLevel = process.env.NODE_ENV === 'production' ? 'info' : 'debug';
  
  if (logLevel === 'debug') {
    console.log(`[${context.timestamp.toISOString()}] ${context.method} ${context.path}`, {
      ip: context.ip,
      userAgent: context.userAgent,
      user: context.user?.email,
      duration: `${Date.now() - start}ms`
    });
  } else {
    console.log(`[${context.timestamp.toISOString()}] ${context.method} ${context.path} - ${context.user?.email || 'anonymous'}`);
  }
  
  await next();
};