import type { Metadata, Viewport } from 'next';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import './globals.css';

export const metadata: Metadata = {
    title: 'NEXA AI — Intelligence Reborn',
    description: 'Asistente de IA avanzado con capacidades multimodales, voz y análisis inteligente.',
    keywords: ['NEXA', 'AI', 'asistente', 'inteligencia artificial', 'chat', 'voz'],
    authors: [{ name: 'NEXA AI' }],
    openGraph: {
        title: 'NEXA AI — Intelligence Reborn',
        description: 'Asistente de IA avanzado con capacidades multimodales',
        type: 'website',
        locale: 'es_ES',
    },
    manifest: '/manifest.json',
};

export const viewport: Viewport = {
    themeColor: '#04040a',
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="es">
            <head>
                <link
                    href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
                    rel="stylesheet"
                />
                <link rel="icon" href="/favicon.ico" />
                <link rel="apple-touch-icon" href="/icons/icon-192.png" />
                <meta name="apple-mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
            </head>
            <body>
                <ErrorBoundary>
                    {children}
                </ErrorBoundary>
            </body>
        </html>
    );
}
