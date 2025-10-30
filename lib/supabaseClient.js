import { createClient } from '@supabase/supabase-js';

let supabaseInstance = null;

export const supabaseBrowser = () => {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error('Missing Supabase environment variables');
  }

  supabaseInstance = createClient(url, key);
  return supabaseInstance;
};
