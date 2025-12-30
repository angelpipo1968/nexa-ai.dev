import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "NEXA AI | El Futuro de la Inteligencia",
  description: "Plataforma de próxima generación para desarrollo de IA automatizado. Sistema Operativo Web.",
  metadataBase: new URL('https://www.nexa-ai.dev/'),
  openGraph: {
    title: "NEXA AI",
    description: "Sistema Operativo Web impulsado por Inteligencia Artificial.",
    url: "https://www.nexa-ai.dev/",
    siteName: "NEXA AI",
    locale: "es_ES",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
