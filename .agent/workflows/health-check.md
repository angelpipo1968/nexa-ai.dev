---
description: Run a full system health check on all Nexa services
---
# System Health Check Workflow

// turbo-all

This workflow checks the health of all Nexa OS services: Ollama, Railway backend, Vercel frontend, and Supabase.

1. Check Ollama local status.
```bash
powershell -Command "try { $r = Invoke-WebRequest -Uri 'http://localhost:11434/api/tags' -TimeoutSec 5; $models = ($r.Content | ConvertFrom-Json).models; Write-Host ('✅ Ollama: ' + $models.Count + ' models loaded'); $models | ForEach-Object { Write-Host ('   - ' + $_.name + ' (' + [math]::Round($_.size/1GB, 1) + ' GB)') } } catch { Write-Host '❌ Ollama: OFFLINE' }"
```

2. Check Vercel frontend.
```bash
powershell -Command "try { $r = Invoke-WebRequest -Uri 'https://nexa-ai.dev' -TimeoutSec 10; Write-Host ('✅ Vercel Frontend: Status ' + $r.StatusCode) } catch { Write-Host ('❌ Vercel Frontend: ' + $_.Exception.Message) }"
```

3. Check Railway backend (if configured).
```bash
powershell -Command "try { $domain = $env:RAILWAY_DOMAIN; if (!$domain) { $domain = 'nexa-ai.dev' }; $r = Invoke-WebRequest -Uri ('https://' + $domain + '/health') -TimeoutSec 15; Write-Host ('✅ Railway Backend: Status ' + $r.StatusCode) } catch { Write-Host ('⚠️ Railway Backend: ' + $_.Exception.Message) }"
```

4. Check Supabase Edge Function.
```bash
powershell -Command "try { $r = Invoke-WebRequest -Uri 'https://ykzoeytmcxlsodwdavtv.supabase.co/functions/v1/nexa-core' -TimeoutSec 10; Write-Host ('✅ Supabase Function: Status ' + $r.StatusCode) } catch { Write-Host ('⚠️ Supabase Function: ' + $_.Exception.Message) }"
```

5. Print summary.
```bash
powershell -Command "Write-Host ''; Write-Host '━━━ NEXA HEALTH REPORT ━━━'; Write-Host ('Timestamp: ' + (Get-Date -Format 'yyyy-MM-dd HH:mm:ss')); Write-Host 'Check individual results above for status of each service.'"
```
