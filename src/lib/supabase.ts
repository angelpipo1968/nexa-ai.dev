import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
    if (_client) return _client;
    
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!url || !key) {
        console.warn('[NEXA] Supabase credentials not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env');
        return null;
    }
    
    try {
        _client = createClient(url, key);
        return _client;
    } catch (e) {
        console.warn('[NEXA] Error initializing Supabase client:', e);
        return null;
    }
}

export const supabase = new Proxy({} as SupabaseClient, {
    get(_, prop) {
        const client = getSupabase();
        if (!client) {
            return () => {
                console.warn('[NEXA] Supabase not configured');
                return Promise.resolve({ data: null, error: 'Supabase not configured' });
            };
        }
        return (client as unknown as Record<string, unknown>)[prop as string];
    },
});

export const isSupabaseConfigured = !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
