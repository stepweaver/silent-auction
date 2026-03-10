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

  const client = createClient(url, key);
  supabaseInstance =
    process.env.NEXT_PUBLIC_DEMO_MODE === 'true' ? client.schema('demo') : client;
  return supabaseInstance;
};
