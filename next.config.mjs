import { withSentryConfig } from '@sentry/nextjs';

const hasSentryToken = !!process.env.SENTRY_AUTH_TOKEN;

/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    eslint: { ignoreDuringBuilds: true },
    typescript: { ignoreBuildErrors: true },
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

let finalConfig = nextConfig;

if (hasSentryToken) {
    try {
        finalConfig = withSentryConfig(nextConfig, {
            org: 'nexa-na',
            project: 'javascript-nextjs',
            authToken: process.env.SENTRY_AUTH_TOKEN,
            tunnelRoute: '/sentry-tunnel',
            silent: !process.env.CI,
            widenClientFileUpload: true,
            hideSourceMaps: true,
            disableLogger: true,
            automaticVercelMonitors: true,
        });
    } catch (e) {
        console.warn('Sentry: withSentryConfig failed to apply. Falling back to default config.');
    }
}

export default finalConfig;
