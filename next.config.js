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
};

export default nextConfig;
