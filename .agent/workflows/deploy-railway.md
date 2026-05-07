---
description: Deploy the Nexa backend to Railway via Git push and verify health
---
# Deploy to Railway Workflow

// turbo-all

This workflow deploys the Nexa backend to Railway and verifies the deployment is healthy.

1. Ensure all changes are committed.
```bash
git status
```

2. Run the pre-deploy validator to check for common issues.
```bash
python scripts/pre_deploy_validator.py
```

3. Build the project to verify no compilation errors.
```bash
npm run build
```

4. Push to main branch (Railway auto-deploys from GitHub).
```bash
git push origin main
```

5. Wait for Railway to process the deployment (~90 seconds).
```bash
powershell -Command "Write-Host '⏳ Waiting 90s for Railway deploy...'; Start-Sleep -Seconds 90; Write-Host '✅ Done waiting'"
```

6. Run the post-deploy health check.
```bash
python scripts/post_deploy_check.py https://$RAILWAY_DOMAIN
```
