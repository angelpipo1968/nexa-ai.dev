---
description: Deploy the Nexa frontend to Vercel production
---
# Deploy to Vercel Workflow

// turbo-all

This workflow builds and deploys the Nexa frontend to Vercel with the nexa-ai.dev alias.

1. Install dependencies if needed.
```bash
npm install
```

2. Run lint checks.
```bash
npm run lint || echo "Lint warnings detected (non-blocking)"
```

3. Build the production bundle.
```bash
npm run build
```

4. Deploy to Vercel production.
```bash
npx vercel --prod --confirm --alias nexa-ai.dev
```

5. Verify the deployment is live.
```bash
powershell -Command "try { $r = Invoke-WebRequest -Uri 'https://nexa-ai.dev' -TimeoutSec 15; Write-Host ('✅ Vercel OK: Status ' + $r.StatusCode) } catch { Write-Host ('❌ Vercel Error: ' + $_.Exception.Message) }"
```
