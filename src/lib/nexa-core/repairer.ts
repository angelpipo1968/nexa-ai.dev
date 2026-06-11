import { callNexaLLM } from './cognitive';

export interface AuditResult {
    analysis: string;
    fixes: string;
    securityLevel: 'Safe' | 'Warning' | 'Critical';
    optimizedCode: string;
}

export async function auditCode(code: string, language: string = 'auto'): Promise<string> {
    try {
        const systemPrompt = `Eres el Auditor de Código de NEXA. Tu misión es encontrar errores, vulnerabilidades y puntos de optimización.
                        
Proporciona un reporte estructurado:
1. ANÁLISIS: Qué está mal o qué se puede mejorar.
2. SEGURIDAD: Nivel de riesgo (Bajo, Medio, Crítico).
3. CÓDIGO REPARADO: El código corregido y optimizado.

Sé extremadamente técnico y preciso.`;
        const userContent = `Lenguaje: ${language}\n\nCódigo:\n${code}`;
        return await callNexaLLM(systemPrompt, userContent);
    } catch (error: any) {
        return `Error en la auditoría de código: ${error.message}`;
    }
}

export async function translateCode(code: string, from: string, to: string): Promise<string> {
    try {
        const systemPrompt = `Traduce el siguiente código de ${from} a ${to}. Mantén la lógica intacta pero usa las mejores prácticas del lenguaje destino.`;
        return await callNexaLLM(systemPrompt, code);
    } catch (e: any) {
        return `Error traduciendo código: ${e.message}`;
    }
}
