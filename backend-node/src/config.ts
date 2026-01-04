/*
 * Environment Variables Configuration
 */
import dotenv from 'dotenv';
dotenv.config();

export const config = {
  // Supabase Configuration
  supabase: {
    url: process.env.SUPABASE_URL || '',
    anonKey: process.env.SUPABASE_ANON_KEY || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    jwtSecret: process.env.SUPABASE_JWT_SECRET || '',
  },
  
  // API Configuration
  api: {
    version: 'v1',
    prefix: '/api',
    corsOrigins: (() => {
      const parsed = process.env.CORS_ORIGINS
        ?.split(',')
        .map(origin => origin.trim())
        .filter(Boolean);
      return parsed && parsed.length > 0
        ? parsed
        : [
            'http://localhost:8080',
            'http://127.0.0.1:8080',
            'http://localhost:5173',
            'http://127.0.0.1:5173',
            'https://stockcalc-frontend.vercel.app',
            'https://stockcalc-frontend-prayas1998-prayas1998s-projects.vercel.app'
          ];
    })()
  },
  
  // Rate Limiting Configuration (mirroring Django settings)
  rateLimiting: {
    // Authentication endpoints
    auth: {
      user: '20/min',
      anon: '10/min'
    },
    // Data operations (CRUD) endpoints
    dataOperations: {
      user: '1000/hour',
      anon: '200/hour'
    },
    // General API endpoints
    general: {
      user: '2000/hour',
      anon: '500/hour'
    }
  },
  
  // Environment
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  
  // Validation
  requiredEnvVars: [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY', 
    'SUPABASE_SERVICE_ROLE_KEY',
    'SUPABASE_JWT_SECRET'
  ]
} as const;

// Environment validation - run immediately when module is imported
validateConfig();

export function validateConfig(): void {
  const missing = config.requiredEnvVars.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please set these environment variables before starting the server.'
    );
  }
  
  if (!config.supabase.url) {
    throw new Error('SUPABASE_URL cannot be empty');
  }
  
  if (!config.supabase.anonKey) {
    throw new Error('SUPABASE_ANON_KEY cannot be empty');
  }
  
  if (!config.supabase.jwtSecret) {
    throw new Error('SUPABASE_JWT_SECRET cannot be empty');
  }
  
  if (!config.supabase.serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY cannot be empty');
  }
}

export default config;
