/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    eslint: { ignoreDuringBuilds: true },
    typescript: { ignoreBuildErrors: true },
    // output: 'standalone',
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

export default nextConfig;
