import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
    title: 'NEXA AI — Intelligence Reborn',
    description: 'NEXA AI: Asistente de inteligencia artificial con interfaz de chat en tiempo real, soporte de voz y análisis de imágenes.',
    manifest: '/manifest.json',
    openGraph: {
        title: 'NEXA AI — Intelligence Reborn',
        description: 'Asistente de IA avanzado y sistema operativo inteligente.',
        url: 'https://www.nexa-ai.dev',
        siteName: 'Nexa OS',
        images: [
            {
                url: '/nexa-logo.jpg',
                width: 1200,
                height: 630,
                alt: 'Nexa AI Interface',
            },
        ],
        locale: 'es_ES',
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'NEXA AI — Intelligence Reborn',
        description: 'Asistente de IA avanzado y sistema operativo inteligente.',
        images: ['/nexa-logo.jpg'],
    },
};

export const viewport: Viewport = {
    themeColor: '#04040a',
    width: 'device-width',
    initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="es">
            <head>
                <link
                    href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
                    rel="stylesheet"
                />
                <link rel="icon" href="/favicon.ico" sizes="any" />
                <link rel="icon" href="/icons/icon-192.png" type="image/png" />
                <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                        __html: JSON.stringify({
                            "@context": "https://schema.org",
                            "@type": "WebApplication",
                            "name": "NEXA AI",
                            "url": "https://www.nexa-ai.dev",
                            "description": "Asistente de inteligencia artificial con interfaz de chat en tiempo real.",
                            "applicationCategory": "ProductivityApplication",
                            "operatingSystem": "Web",
                            "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
                        }),
                    }}
                />
            </head>
            <body>{children}</body>
        </html>
    );
}
