// ═══════════════════════════════════════════
//  NEXA CORE — Sistema de Herramientas
// ═══════════════════════════════════════════

export interface ToolResult {
    success: boolean;
    output: string;
    error?: string;
}

// ─── Detección de Intención ───
export type UserIntent = 
    | { type: 'code'; language?: string; description: string }
    | { type: 'web'; description: string }
    | { type: 'design'; description: string }
    | { type: 'analysis'; subject: string }
    | { type: 'vision'; hasImage: boolean }
    | { type: 'chat'; message: string };

export function detectIntent(message: string): UserIntent {
    const lower = message.toLowerCase();
    
    if (lower.includes('código') || lower.includes('codigo') || lower.includes('code') || 
        lower.includes('función') || lower.includes('script') || lower.includes('programa') ||
        lower.includes('api') || lower.includes('endpoint')) {
        const langMatch = message.match(/(?:python|javascript|typescript|react|html|css|sql|go|rust|java|c\+\+)/i);
        return { type: 'code', language: langMatch?.[0]?.toLowerCase(), description: message };
    }
    
    if (lower.includes('página web') || lower.includes('pagina web') || lower.includes('website') || 
        lower.includes('landing') || lower.includes('portfolio') || lower.includes('sitio web')) {
        return { type: 'web', description: message };
    }
    
    if (lower.includes('diseño') || lower.includes('logo') || lower.includes('ui') || 
        lower.includes('ux') || lower.includes('interfaz') || lower.includes('mockup')) {
        return { type: 'design', description: message };
    }
    
    if (lower.includes('analiza') || lower.includes('analice') || lower.includes('explica') || 
        lower.includes('por qué') || lower.includes('por que') || lower.includes('cómo funciona')) {
        return { type: 'analysis', subject: message };
    }
    
    return { type: 'chat', message };
}
