// ═══════════════════════════════════════════
//  NEXA CORE — Logger & Error Monitor
//  Logging estructurado para producción
// ═══════════════════════════════════════════

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
    level: LogLevel;
    message: string;
    context?: string;
    data?: any;
    timestamp: string;
    requestId?: string;
}

const LOG_COLORS: Record<LogLevel, string> = {
    debug: '\x1b[36m',  // cyan
    info: '\x1b[32m',   // green
    warn: '\x1b[33m',   // yellow
    error: '\x1b[31m',  // red
};

const RESET = '\x1b[0m';

function formatLog(entry: LogEntry): string {
    const color = LOG_COLORS[entry.level];
    const prefix = entry.context ? `[${entry.context}]` : '[NEXA]';
    const reqId = entry.requestId ? ` (${entry.requestId})` : '';
    return `${color}${entry.timestamp} ${entry.level.toUpperCase()}${RESET} ${prefix}${reqId} ${entry.message}`;
}

function log(level: LogLevel, message: string, context?: string, data?: any): void {
    const entry: LogEntry = {
        level,
        message,
        context,
        data,
        timestamp: new Date().toISOString(),
    };

    // En producción, solo log info+
    if (process.env.NODE_ENV === 'production' && level === 'debug') return;

    const formatted = formatLog(entry);

    switch (level) {
        case 'error':
            console.error(formatted, data ? '\n' + JSON.stringify(data, null, 2) : '');
            break;
        case 'warn':
            console.warn(formatted, data ? '\n' + JSON.stringify(data, null, 2) : '');
            break;
        default:
            console.log(formatted, data ? '\n' + JSON.stringify(data, null, 2) : '');
    }

    // En producción, enviar errores críticos a servicio externo
    if (level === 'error' && process.env.NODE_ENV === 'production') {
        sendToMonitoring(entry).catch(() => {});
    }
}

async function sendToMonitoring(entry: LogEntry): Promise<void> {
    // Placeholder para integración con Sentry, LogRocket, etc.
    // Cuando configures Sentry, descomenta:
    // if (typeof Sentry !== 'undefined') {
    //     Sentry.captureMessage(entry.message, {
    //         level: 'error',
    //         extra: entry.data,
    //         tags: { context: entry.context },
    //     });
    // }
}

export const logger = {
    debug: (msg: string, ctx?: string, data?: any) => log('debug', msg, ctx, data),
    info: (msg: string, ctx?: string, data?: any) => log('info', msg, ctx, data),
    warn: (msg: string, ctx?: string, data?: any) => log('warn', msg, ctx, data),
    error: (msg: string, ctx?: string, data?: any) => log('error', msg, ctx, data),
};

/**
 * Genera un ID único para request tracking
 */
export function generateRequestId(): string {
    return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Middleware de logging para API routes
 */
export function withLogging<T extends (...args: any[]) => Promise<Response>>(
    handler: T,
    routeName: string
): T {
    return (async (...args: any[]) => {
        const req = args[0] as Request;
        const requestId = generateRequestId();
        const start = Date.now();

        logger.info(`${req.method} ${routeName} started`, routeName, { requestId });

        try {
            const response = await handler(...args);
            const duration = Date.now() - start;
            logger.info(`${req.method} ${routeName} completed (${response.status}) in ${duration}ms`, routeName, { requestId, status: response.status, duration });
            return response;
        } catch (error: any) {
            const duration = Date.now() - start;
            logger.error(`${req.method} ${routeName} failed in ${duration}ms: ${error.message}`, routeName, { requestId, error: error.message, stack: error.stack });
            throw error;
        }
    }) as T;
}
