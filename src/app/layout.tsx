import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
    title: 'NEXA AI — Intelligence Reborn',
    description: 'Asistente de IA avanzado',
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
            </head>
            <body>{children}</body>
        </html>
    );
}
