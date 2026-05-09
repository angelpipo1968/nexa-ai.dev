// Sentry instrumentation — disabled wrapper to avoid runtime conflicts
// Sentry still works via sentry.client.config.ts and sentry.server.config.ts
export async function register() {
    // Intentionally empty — Sentry initializes via config files
}
