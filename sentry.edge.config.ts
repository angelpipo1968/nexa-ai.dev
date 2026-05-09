import * as Sentry from '@sentry/nextjs';

Sentry.init({
    dsn: 'https://078a50e873ac105861532521dab7abfd@o4511359879348224.ingest.us.sentry.io/4511359882559488',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    debug: false,
    environment: process.env.NODE_ENV || 'development',
});
