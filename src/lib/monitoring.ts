// Basic error monitoring setup
// Replace with actual Sentry DSN when available

export function initMonitoring() {
  // TODO: Add Sentry init when DSN is available
  // import * as Sentry from '@sentry/nextjs';
  // Sentry.init({ dsn: process.env.SENTRY_DSN });
}

export function captureError(error: Error, context?: Record<string, unknown>) {
  console.error('[NEXA Error]', error.message, context);
  // TODO: Sentry.captureException(error, { extra: context });
}

export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
  if (level === 'error') console.error('[NEXA]', message);
  else if (level === 'warning') console.warn('[NEXA]', message);
  // TODO: Sentry.captureMessage(message, level);
}
