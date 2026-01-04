import { Context } from 'hono';
import { ApiErrorResponse, RequestContext } from '../types.js';
import { randomUUID } from 'crypto';

// Error categories (matching Django implementation exactly)
const ERROR_MESSAGES = {
  authentication: 'Authentication failed. Please log in again.',
  authorization: 'You don\'t have permission to perform this action.',
  validation: 'The provided data is invalid.',
  not_found: 'The requested resource was not found.',
  rate_limit: 'Too many requests. Please try again later.',
  database: 'A database error occurred. Please try again.',
  external_service: 'An external service is temporarily unavailable.',
  server_error: 'An internal server error occurred. Please try again later.',
  configuration: 'A configuration error occurred.'
};

const STATUS_CODES = {
  authentication: 401,
  authorization: 403,
  validation: 400,
  not_found: 404,
  rate_limit:429,
  database: 500,
  external_service: 503,
  server_error: 500,
  configuration: 500
} as const;

// Helper function to generate UUID4 error IDs (matching Django)
function generateErrorId(): string {
  return randomUUID();
}

export const errorHandler = async (c: Context, next: () => Promise<void>) => {
  try {
    await next();
  } catch (error) {
    // Determine error category
    let category: keyof typeof ERROR_MESSAGES = 'server_error';
    let message = ERROR_MESSAGES.server_error;
    
    if (error instanceof Error) {
      if (error.message.includes('Authentication') || error.message.includes('auth')) {
        category = 'authentication';
      } else if (error.message.includes('Permission') || error.message.includes('authorize')) {
        category = 'authorization';
      } else if (error.message.includes('validation') || error.message.includes('Invalid')) {
        category = 'validation';
      } else if (error.message.includes('not found') || error.message.includes('404')) {
        category = 'not_found';
      } else if (error.message.includes('rate limit') || error.message.includes('throttle')) {
        category = 'rate_limit';
      }
      
      message = ERROR_MESSAGES[category];
      
      // Generate unique error ID (matching Django UUID4)
      const errorId = generateErrorId();
      
      // Log error with context
      console.error(`Error ${category}:`, {
        error_id: errorId,
        category,
        error_type: error?.constructor?.name || 'Unknown',
        error_message: error?.message || 'Unknown error',
        request: {
          method: c.req.method,
          path: c.req.path,
          user_id: c.get('userId'),
          ip: c.req.header('x-forwarded-for') || c.req.header('x-real-ip'),
          user_agent: c.req.header('user-agent')
        }
      });
    }
    
    const statusCode = STATUS_CODES[category];
    const errorId = generateErrorId(); // Generate here too for cases without error object
    const response: ApiErrorResponse = {
      error: true,
      error_id: errorId,
      category,
      message
    };
    
    // Add debug info in development
    if (process.env.NODE_ENV === 'development') {
      const errorObj = error as any;
      response.debug_info = {
        error_type: errorObj?.constructor?.name || 'Unknown',
        error_message: errorObj?.message || 'Unknown error',
        traceback: errorObj?.stack || ''
      };
    }
    
    return c.json(response, statusCode);
  }
};