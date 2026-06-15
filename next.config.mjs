/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    output: undefined,
    typescript: { ignoreBuildErrors: true },
    images: {
        unoptimized: true,
    },
    compress: true,
    turbopack: {
        root: '..',
    },
}

export default nextConfig;
