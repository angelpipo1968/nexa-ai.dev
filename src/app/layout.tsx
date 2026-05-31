import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'NEXA PRO v5.2 — AI Assistant',
  description: 'Advanced AI assistant with 37+ tools: Chat, Vision, Voice, Code, Flights, Weather, Lottery & more.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#0a0a0f" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body style={{margin:0,background:'#0a0a0f',color:'#e2e8f0',fontFamily:"'Segoe UI',system-ui,-apple-system,sans-serif",minHeight:'100vh'}}>
        {children}
      </body>
    </html>
  )
}
