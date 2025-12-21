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
  userId: string,
  queryFn: (client: SupabaseClient) => Promise<T>
): Promise<T> {
  // Set user context for RLS
  const client = supabaseClient;
  
  // Override auth context for this request
  client.auth.setSession({
    access_token: '', // We'll use the user ID directly
    refresh_token: ''
  });
  
  try {
    return await queryFn(client);
  } catch (error) {
    console.error(`Database operation failed for user ${userId}:`, error);
    throw error;
  }
}

// Helper to build user-scoped queries
export function withUserScope(userId: string, table: string) {
  return {
    select: (columns = '*') => 
      supabaseClient
        .from(table)
        .select(columns)
        .eq('user_id', userId),
        
    insert: (data: any) =>
      supabaseClient
        .from(table)
        .insert({ ...data, user_id: userId }),
        
    update: (data: any) =>
      supabaseClient
        .from(table)
        .update(data)
        .eq('user_id', userId),
        
    delete: () =>
      supabaseClient
        .from(table)
        .delete()
        .eq('user_id', userId),
        
    // For operations that need both select and other clauses
    from: () => supabaseClient.from(table)
  };
}

export default {
  supabaseClient,
  supabaseAdmin,
  executeWithUserScope,
  withUserScope
};