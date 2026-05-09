import { withSentryConfig } from '@sentry/nextjs';

const hasSentryToken = !!process.env.SENTRY_AUTH_TOKEN;

/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    eslint: { ignoreDuringBuilds: true },
    typescript: { ignoreBuildErrors: true },
    output: 'standalone',
    images: {
        remotePatterns: [
            { protocol: 'https', hostname: 'ykzoeytmcxlsodwdavtv.supabase.co' },
        ],
    },
    compress: true,
    async headers() {
        return [
            {
                source: '/(.*)',
                headers: [
                    { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
                    { key: 'X-Content-Type-Options', value: 'nosniff' },
                    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
                    { key: 'X-XSS-Protection', value: '1; mode=block' },
                    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' }
                ],
            },
        ];
    },
};

// Only wrap with withSentryConfig if SENTRY_AUTH_TOKEN is available
// This prevents build failures on Railway/other platforms without the token
export default hasSentryToken
    ? withSentryConfig(nextConfig, {
        org: 'nexa-ai',
        project: 'nexa-ai',
        authToken: process.env.SENTRY_AUTH_TOKEN,
        tunnelRoute: '/sentry-tunnel',
        silent: !process.env.CI,
        widenClientFileUpload: true,
        hideSourceMaps: true,
        disableLogger: true,
        automaticVercelMonitors: true,
    })
    : nextConfig;
