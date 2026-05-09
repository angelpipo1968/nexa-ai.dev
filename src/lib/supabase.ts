import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
    if (_client) return _client;
    
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ykzoeytmcxlsodwdavtv.supabase.co';
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlrem9leXRtY3hsc29kd2RhdnR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyNTc5MTcsImV4cCI6MjA4MTgzMzkxN30.wKXw4M5I85HdgjdcIU33t0JGub_xNyv3FTv3jrc0WAE';
    
    _client = createClient(url, key);
    return _client;
}

export const supabase = new Proxy({} as SupabaseClient, {
    get(_, prop) {
        return (getSupabase() as unknown as Record<string, unknown>)[prop as string];
    },
});

export const isSupabaseConfigured = !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
