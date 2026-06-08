import { NextRequest } from 'next/server';
import { consumeChunk } from '@/lib/nexa-core/kernel/event-bus';
import { getJobStatus } from '@/lib/nexa-core/kernel/scheduler';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get('job_id');

    if (!jobId) {
        return new Response('Missing job_id', { status: 400 });
    }

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        async start(controller) {
            let done = false;
            let retries = 0;

            while (!done) {
                try {
                    // Consumimos el event-bus pseudo-pub/sub usando LPOP
                    const chunk = await consumeChunk(jobId);
                    
                    if (chunk) {
                        retries = 0;
                        if (chunk === '[DONE]') {
                            controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
                            done = true;
                        } else if (chunk.startsWith('[ERROR]')) {
                            const errorMsg = chunk.replace('[ERROR] ', '');
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: errorMsg })}\n\n`));
                        } else {
                            // Enviar token al cliente compatible con la UI
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunk, provider: 'kernel_v1' })}\n\n`));
                        }
                    } else {
                        retries++;
                        
                        // Si esperamos mucho (5 segundos sin tokens), checamos si el job murió
                        if (retries > 50) { 
                            const status = await getJobStatus(jobId);
                            if (!status || status.status === 'failed' || status.status === 'killed') {
                                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: `Job interrupted: ${status?.status}` })}\n\n`));
                                done = true;
                                break;
                            }
                            retries = 0;
                        }
                        
                        // Polling delay ultra-corto
                        await new Promise(resolve => setTimeout(resolve, 100));
                    }
                } catch (err) {
                    controller.error(err);
                    done = true;
                }
            }
            controller.close();
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*'
        }
    });
}
