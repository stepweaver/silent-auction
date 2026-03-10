import { createClient } from '@supabase/supabase-js';

export const supabaseServer = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('Missing Supabase environment variables');
  }

  const client = createClient(url, key, {
    auth: {
      persistSession: false,
    },
  });

  if (process.env.DEMO_MODE === 'true') {
    return client.schema('demo');
  }
  return client;
};
