import { Message } from '@/store/useChatStore';

/**
 * Exporta los mensajes de una conversación como formato Markdown.
 */
export function exportAsMarkdown(messages: Message[], title: string): string {
    let md = `# ${title}\n\n`;
    
    messages.forEach((msg) => {
        const role = msg.role === 'user' ? 'USUARIO' : 'NEXA AI';
        md += `### ${role}\n${msg.content}\n\n---\n\n`;
    });
    
    return md;
}

/**
 * Exporta los mensajes de una conversación como formato JSON.
 */
export function exportAsJSON(messages: Message[], conversationId: string): string {
    return JSON.stringify({
        id: conversationId,
        exported_at: new Date().toISOString(),
        messages: messages.map(m => ({
            role: m.role,
            content: m.content,
            timestamp: m.timestamp
        }))
    }, null, 2);
}

/**
 * Dispara la descarga de un archivo en el navegador.
 */
export function downloadFile(content: string, filename: string, mimeType: string) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
