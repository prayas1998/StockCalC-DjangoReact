import { createClient, SupabaseClient } from '@supabase/supabase-js';
import config from '../config';

// Supabase client for user operations (uses anon key, respects RLS)
export const supabaseClient = createClient(
  config.supabase.url,
  config.supabase.anonKey,
  {
    auth: {
      persistSession: false,
      detectSessionInUrl: false,
    },
  }
);

// Supabase admin client for privileged operations (uses service role key)
export const supabaseAdmin = createClient(
  config.supabase.url,
  config.supabase.serviceRoleKey,
  {
    auth: {
      persistSession: false,
      detectSessionInUrl: false,
    },
  }
);

// Helper to execute queries with user scoping
export async function executeWithUserScope<T>(
  accessToken: string,
  queryFn: (client: SupabaseClient) => Promise<T>
): Promise<T> {
  // Create a new client instance for this request with the user's JWT
  const client = createClient(
    config.supabase.url,
    config.supabase.anonKey,
    {
      auth: {
        persistSession: false,
        detectSessionInUrl: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    }
  );
  
  try {
    return await queryFn(client);
  } catch (error) {
    console.error('Database operation failed:', error);
    throw error;
  }
}

// Helper to build user-scoped queries
export function withUserScope(accessToken: string, table: string) {
  // Create a new client instance with the user's JWT
  const client = createClient(
    config.supabase.url,
    config.supabase.anonKey,
    {
      auth: {
        persistSession: false,
        detectSessionInUrl: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    }
  );

  return {
    select: (columns = '*') => 
      client
        .from(table)
        .select(columns),
        
    insert: (data: any) =>
      client
        .from(table)
        .insert(data),
        
    update: (data: any, filter?: any) =>
      client
        .from(table)
        .update(data)
        .match(filter || {}),
        
    delete: (filter?: any) =>
      client
        .from(table)
        .delete()
        .match(filter || {}),
        
    // For operations that need both select and other clauses
    from: () => client.from(table)
  };
}

export default {
  supabaseClient,
  supabaseAdmin,
  executeWithUserScope,
  withUserScope
};