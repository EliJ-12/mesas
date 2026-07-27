import { createClient } from '@supabase/supabase-js';

// Variables de entorno (configúralas en Vercel y en .env.local)
// NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
// NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxx

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    realtime: {
      params: {
        eventsPerSecond: 10, // margen de sobra; el realtime es push, no polling
      },
    },
  }
);
