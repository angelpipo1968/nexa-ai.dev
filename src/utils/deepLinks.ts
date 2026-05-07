import { supabase } from '@/lib/supabase';

// Tipos de deep links que NEXA maneja
export type DeepLinkType =
    | 'chat'           // nexa://open/chat/{id}
    | 'new-chat'       // nexa://open/new?q={query}
    | 'share'          // Texto compartido a la app
    | 'settings'       // nexa://open/settings
    | 'unknown';

export interface DeepLinkData {
    type: DeepLinkType;
    conversationId?: string;
    query?: string;
    sharedText?: string;
    url?: string;
}

// Parsear URL del deep link
export function parseDeepLink(url: string): DeepLinkData {
    try {
        const parsed = new URL(url);

        // Custom scheme: nexa://open/chat/abc123
        if (parsed.protocol === 'nexa:') {
            const pathParts = parsed.pathname.replace(/^\/\//, '').split('/').filter(Boolean);

            if (pathParts[0] === 'chat' && pathParts[1]) {
                return {
                    type: 'chat',
                    conversationId: pathParts[1],
                };
            }

            if (pathParts[0] === 'new') {
                return {
                    type: 'new-chat',
                    query: parsed.searchParams.get('q') || undefined,
                };
            }

            if (pathParts[0] === 'settings') {
                return { type: 'settings' };
            }

            return { type: 'unknown', url };
        }

        // HTTPS: https://nexa-ai.dev/chat/abc123
        if (parsed.hostname === 'nexa-ai.dev' || parsed.hostname === 'www.nexa-ai.dev') {
            const pathParts = parsed.pathname.split('/').filter(Boolean);

            if (pathParts[0] === 'chat' && pathParts[1]) {
                return {
                    type: 'chat',
                    conversationId: pathParts[1],
                };
            }

            if (parsed.searchParams.has('q')) {
                return {
                    type: 'new-chat',
                    query: parsed.searchParams.get('q') || undefined,
                };
            }

            return { type: 'unknown', url };
        }

        return { type: 'unknown', url };
    } catch {
        return { type: 'unknown', url };
    }
}

// Generar deep links para compartir
export function generateDeepLink(type: DeepLinkType, params?: Record<string, string>): string {
    switch (type) {
        case 'chat':
            return `https://nexa-ai.dev/chat/${params?.id || ''}`;
        case 'new-chat':
            return `https://nexa-ai.dev/?q=${encodeURIComponent(params?.query || '')}`;
        default:
            return 'https://nexa-ai.dev';
    }
}

// Generar link corto para compartir conversación
export function generateShareLink(conversationId: string): string {
    return `https://nexa-ai.dev/chat/${conversationId}`;
}

// Generar QR code URL (usando API externa)
export function generateQRUrl(url: string): string {
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}&bgcolor=0a0a0a&color=00e5a0`;
}
