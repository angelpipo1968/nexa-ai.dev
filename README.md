# NEXA AI — Intelligence Reborn

Asistente de IA avanzado con chat en tiempo real, voz, y análisis de imágenes.

## Stack

- **Framework**: Next.js 15 + React 19
- **Styling**: Tailwind CSS
- **Animation**: Framer Motion
- **Database**: Supabase
- **Monitoring**: Sentry
- **Mobile**: Capacitor (Android)
- **Deployment**: Vercel

## Desarrollo

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

## Estructura

```
src/
├── app/              # Next.js App Router
│   ├── api/          # API routes (chat, vision, health)
│   ├── chat/         # Chat page
│   └── page.tsx      # Home (redirects to chat)
├── components/       # React components
│   ├── NexaApp.tsx   # Main chat interface
│   └── SettingsPanel.tsx
└── lib/              # Utilities & services
    ├── supabase.ts
    ├── validation.ts
    └── nexa-core/    # AI core (prompts, tools, rate-limiting)
```

## Deploy

Push a `main` → deploy automático en Vercel.

## Licencia

MIT
