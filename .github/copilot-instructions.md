# NEXA OS - AI Coding Agent Instructions

## Project Overview
NEXA OS is a Spanish-language AI chat assistant built with Next.js 14, powered by Anthropic Claude. The app features voice input/output and runs as a single-page application.

## Architecture Patterns
- **Single-page app**: Main chat interface in `app/page.tsx.jsx` (large component with all state management)
- **Direct API integration**: Client-side fetches directly to Anthropic API, bypassing the unused `app/api/chat/route.ts`
- **Spanish-first**: All UI text, comments, and system prompts in Spanish
- **Voice features**: Web Speech API for recognition (`webkitSpeechRecognition`) and synthesis (`speechSynthesis`)

## Key Implementation Patterns

### API Communication
```typescript
// Direct Anthropic API call (from app/page.tsx.jsx:187)
const response = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': process.env.ANTHROPIC_API_KEY,
    'anthropic-version': '2023-06-01'
  },
  body: JSON.stringify({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    system: "Eres NEXA OS, un asistente de IA amigable...",
    messages: messages
  })
});
```

### State Management
- Use React hooks (`useState`, `useRef`, `useEffect`) in large components
- Store user name in `localStorage` with key `'nexa_user_name'`
- Manage message history as array of `{role: string, content: string}`

### Voice Integration
```javascript
// Speech recognition setup (from app/page.tsx.jsx)
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();
recognition.lang = 'es-ES'; // Spanish
recognition.continuous = false;
```

```javascript
// Text-to-speech (from app/page.tsx.jsx)
const utterance = new SpeechSynthesisUtterance(text);
utterance.lang = 'es-ES';
speechSynthesis.speak(utterance);
```

### UI Components
- Use Lucide React icons throughout
- Tailwind CSS for styling with custom CSS variables in `app/globals.css`
- Responsive design with sidebar toggle

### Error Handling
- Handle Anthropic API errors: 401 (invalid key), 429 (rate limit)
- Display errors in Spanish to user
- Use AbortController for request cancellation

## Development Workflow
- `npm run dev`: Start development server on localhost:3000
- Environment: `.env.local` with `ANTHROPIC_API_KEY`
- Build: `npm run build` then `npm run start`

## Code Style Conventions
- TypeScript with React.FC patterns
- Spanish comments and variable names where appropriate
- Large, self-contained components (avoid over-modularization)
- Async/await for API calls with try/catch blocks

## File Structure Reference
- `app/page.tsx.jsx`: Main chat component (700+ lines)
- `app/layout.tsx`: Root layout with Spanish lang attribute
- `components/ChatApp.tsx.tsx`: Alternative component version (unused)
- `app/api/chat/route.ts`: Server-side API route (currently unused)</content>
<parameter name="filePath">c:\Users\pipog\nexa-os-clean\.github\copilot-instructions.md