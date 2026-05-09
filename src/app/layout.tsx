import type { Metadata, Viewport } from 'next';
import './globals.css';
import { SentryInit } from '@/components/sentry-init';

export const metadata: Metadata = {
    title: 'NEXA AI — Intelligence Reborn',
    description: 'Asistente de IA avanzado',
    manifest: '/manifest.json',
};

export const viewport: Viewport = {
    themeColor: '#02020a',
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="es" suppressHydrationWarning>
            <head>
                <link rel="icon" href="/favicon.ico" />
            </head>
            <body suppressHydrationWarning>
                <SentryInit />
                {children}
            </body>
        </html>
    );
}
