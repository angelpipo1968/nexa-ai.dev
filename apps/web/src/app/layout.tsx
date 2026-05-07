import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { CommandDock } from "@/components/layout/CommandDock";
import { SystemImmunityBoundary } from "@/components/SystemImmunityBoundary";

const poppins = Poppins({
    weight: ['300', '400', '500', '600', '700'],
    subsets: ['latin'],
    display: 'swap',
    variable: '--font-poppins',
});

export const metadata: Metadata = {
    title: "NEXA OS | Ultimate Evolution",
    description: "The most immersive Al Assistant ecosystem.",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="es" className="dark">
            <head>
                <link rel="search" type="application/opensearchdescription+xml" title="Nexa AI" href="/opensearch.xml" />
                <link
                    rel="stylesheet"
                    href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
                />
            </head>
            <body className={poppins.variable}>
                <div className="nexa-app">
                    {/* Background Visuals */}
                    <div className="fixed inset-0 z-0 pointer-events-none">
                        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-nexa-purple/10 blur-[120px] rounded-full animate-pulse" />
                        <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-nexa-cyan/10 blur-[120px] rounded-full animate-pulse" />
                        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:radial-gradient(white,transparent)] opacity-[0.03]" />
                    </div>

                    <main className="nexa-main relative z-10 w-full max-w-[1600px] mx-auto px-6 pt-6 pb-32">
                        <SystemImmunityBoundary>
                            {children}
                        </SystemImmunityBoundary>
                    </main>

                    <CommandDock />
                </div>
            </body>
        </html>
    );
}
