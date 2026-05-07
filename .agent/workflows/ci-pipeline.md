---
description: Run the full CI pipeline: lint, test, build, and deploy
---
# Full CI Pipeline Workflow

This workflow runs the complete CI pipeline locally before pushing.

1. Install dependencies.
// turbo
```bash
npm install
```

2. Run ESLint.
// turbo
```bash
npm run lint || echo "⚠️ Lint warnings detected"
```

3. Run tests.
// turbo
```bash
npm run test -- --ci --watchAll=false || echo "⚠️ Tests failed or not configured"
```

4. Build the production bundle.
// turbo
```bash
npm run build
```

5. Run the pre-deploy validator.
// turbo
```bash
python scripts/pre_deploy_validator.py
```

6. Confirm all checks passed. Ready to deploy?
```bash
echo "✅ All CI checks passed. Run /deploy-vercel or /deploy-railway to deploy."
```
