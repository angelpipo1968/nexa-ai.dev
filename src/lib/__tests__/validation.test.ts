import { describe, it, expect } from 'vitest';
import { chatSchema, visionSchema, codeGenSchema, aiSchema } from '../validation';

describe('chatSchema', () => {
    it('debe aceptar mensajes válidos', () => {
        const result = chatSchema.safeParse({
            messages: [
                { role: 'user', content: 'Hola NEXA' },
                { role: 'assistant', content: '¡Hola! ¿En qué puedo ayudarte?' },
            ],
        });
        expect(result.success).toBe(true);
    });

    it('debe aceptar mensajes con system role', () => {
        const result = chatSchema.safeParse({
            messages: [
                { role: 'system', content: 'Eres NEXA' },
                { role: 'user', content: 'Hola' },
            ],
        });
        expect(result.success).toBe(true);
    });

    it('debe aceptar campo mode opcional', () => {
        const result = chatSchema.safeParse({
            messages: [{ role: 'user', content: 'test' }],
            mode: 'code',
        });
        expect(result.success).toBe(true);
    });

    it('debe rechazar array vacío de mensajes', () => {
        const result = chatSchema.safeParse({ messages: [] });
        expect(result.success).toBe(false);
    });

    it('debe rechazar role inválido', () => {
        const result = chatSchema.safeParse({
            messages: [{ role: 'hacker', content: 'test' }],
        });
        expect(result.success).toBe(false);
    });

    it('debe rechazar más de 50 mensajes', () => {
        const messages = Array.from({ length: 51 }, (_, i) => ({
            role: 'user' as const,
            content: `Message ${i}`,
        }));
        const result = chatSchema.safeParse({ messages });
        expect(result.success).toBe(false);
    });

    it('debe aceptar exactamente 50 mensajes', () => {
        const messages = Array.from({ length: 50 }, (_, i) => ({
            role: 'user' as const,
            content: `Message ${i}`,
        }));
        const result = chatSchema.safeParse({ messages });
        expect(result.success).toBe(true);
    });
});

describe('visionSchema', () => {
    it('debe aceptar imagen válida', () => {
        const result = visionSchema.safeParse({
            image: 'base64encodeddata',
        });
        expect(result.success).toBe(true);
    });

    it('debe aceptar todos los campos opcionales', () => {
        const result = visionSchema.safeParse({
            image: 'base64data',
            mimeType: 'image/jpeg',
            question: '¿Qué ves en esta imagen?',
            model: 'gemini-1.5-flash',
        });
        expect(result.success).toBe(true);
    });

    it('debe rechazar imagen vacía', () => {
        const result = visionSchema.safeParse({ image: '' });
        expect(result.success).toBe(false);
    });

    it('debe rechazar question demasiado larga', () => {
        const result = visionSchema.safeParse({
            image: 'base64data',
            question: 'x'.repeat(5001),
        });
        expect(result.success).toBe(false);
    });

    it('debe aceptar question de 5000 caracteres', () => {
        const result = visionSchema.safeParse({
            image: 'base64data',
            question: 'x'.repeat(5000),
        });
        expect(result.success).toBe(true);
    });
});

describe('codeGenSchema', () => {
    it('debe aceptar prompt válido', () => {
        const result = codeGenSchema.safeParse({
            prompt: 'Crea un componente React para un botón',
        });
        expect(result.success).toBe(true);
    });

    it('debe aceptar todos los campos opcionales', () => {
        const result = codeGenSchema.safeParse({
            prompt: 'Crea una API REST',
            language: 'typescript',
            framework: 'express',
        });
        expect(result.success).toBe(true);
    });

    it('debe rechazar prompt vacío', () => {
        const result = codeGenSchema.safeParse({ prompt: '' });
        expect(result.success).toBe(false);
    });

    it('debe rechazar prompt excesivamente largo', () => {
        const result = codeGenSchema.safeParse({ prompt: 'x'.repeat(10001) });
        expect(result.success).toBe(false);
    });

    it('debe aceptar prompt de 10000 caracteres', () => {
        const result = codeGenSchema.safeParse({ prompt: 'x'.repeat(10000) });
        expect(result.success).toBe(true);
    });
});

describe('aiSchema', () => {
    it('debe aceptar request válida', () => {
        const result = aiSchema.safeParse({
            messages: [{ role: 'user', content: 'Hello' }],
        });
        expect(result.success).toBe(true);
    });

    it('debe aceptar todos los campos opcionales', () => {
        const result = aiSchema.safeParse({
            provider: 'gemini',
            model: 'gemini-1.5-flash',
            messages: [{ role: 'user', content: 'Hello' }],
            temperature: 0.7,
            max_tokens: 4096,
        });
        expect(result.success).toBe(true);
    });

    it('debe rechazar provider inválido', () => {
        const result = aiSchema.safeParse({
            provider: 'invalid-provider',
            messages: [{ role: 'user', content: 'Hello' }],
        });
        expect(result.success).toBe(false);
    });

    it('debe aceptar providers válidos', () => {
        for (const provider of ['gemini', 'anthropic', 'auto']) {
            const result = aiSchema.safeParse({
                provider,
                messages: [{ role: 'user', content: 'Hello' }],
            });
            expect(result.success).toBe(true);
        }
    });

    it('debe rechazar temperature fuera de rango', () => {
        const result = aiSchema.safeParse({
            messages: [{ role: 'user', content: 'Hello' }],
            temperature: 3.0,
        });
        expect(result.success).toBe(false);
    });

    it('debe aceptar temperature en rango válido', () => {
        for (const temp of [0, 0.5, 1.0, 1.5, 2.0]) {
            const result = aiSchema.safeParse({
                messages: [{ role: 'user', content: 'Hello' }],
                temperature: temp,
            });
            expect(result.success).toBe(true);
        }
    });

    it('debe rechazar max_tokens fuera de rango', () => {
        const result = aiSchema.safeParse({
            messages: [{ role: 'user', content: 'Hello' }],
            max_tokens: 50000,
        });
        expect(result.success).toBe(false);
    });

    it('debe rechazar array vacío de mensajes', () => {
        const result = aiSchema.safeParse({ messages: [] });
        expect(result.success).toBe(false);
    });

    it('debe rechazar role inválido en mensajes', () => {
        const result = aiSchema.safeParse({
            messages: [{ role: 'root', content: 'Hello' }],
        });
        expect(result.success).toBe(false);
    });
});
