import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
    if (_client) return _client;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';
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
