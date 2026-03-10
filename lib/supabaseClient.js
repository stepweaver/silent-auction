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

  const baseClient = createClient(url, key);
  const isDemo = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

  if (!isDemo) {
    supabaseInstance = baseClient;
    return supabaseInstance;
  }

  // In demo mode, client.schema('demo') returns a PostgrestClient that lacks
  // .channel() for Realtime. Use base client for channel/removeChannel and
  // schema-scoped client only for from().
  const schemaClient = baseClient.schema('demo');
  supabaseInstance = {
    from: (table) => schemaClient.from(table),
    channel: (...args) => baseClient.channel(...args),
    removeChannel: (channel) => baseClient.removeChannel(channel),
  };
  return supabaseInstance;
};
