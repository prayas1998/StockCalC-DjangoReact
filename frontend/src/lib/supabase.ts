import { createClient } from '@supabase/supabase-js';
import { getSessionStorageKey } from './authSession';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Remove or comment out console.error for missing Supabase credentials.
// if (!supabaseUrl || !supabaseAnonKey) {
//   console.error('Missing Supabase credentials. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.');
// }

export const authSessionStorageKey = getSessionStorageKey(supabaseUrl);
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { storageKey: authSessionStorageKey },
});
