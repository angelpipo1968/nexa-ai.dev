---
description: Manage Ollama local AI models (list, pull, remove, test)
---
# Manage Ollama Models Workflow

// turbo-all

This workflow helps manage Ollama models on the local machine.

1. List all installed models.
```bash
powershell -Command "try { $r = Invoke-WebRequest -Uri 'http://localhost:11434/api/tags' -TimeoutSec 5; $models = ($r.Content | ConvertFrom-Json).models; Write-Host ('📦 Installed Models: ' + $models.Count); $models | ForEach-Object { Write-Host ('   ' + $_.name + ' | ' + [math]::Round($_.size/1GB, 1) + ' GB | ' + $_.details.family + ' | ' + $_.details.quantization_level) } } catch { Write-Host '❌ Ollama is not running. Start it first.' }"
```

2. Check disk space available for new models.
```bash
powershell -Command "$drive = (Get-PSDrive C); $freeGB = [math]::Round($drive.Free/1GB, 1); Write-Host ('💾 Free disk space: ' + $freeGB + ' GB'); if ($freeGB -lt 5) { Write-Host '⚠️ Low disk space! Consider removing unused models.' }"
```

3. Test the primary model (nexa-os).
```bash
powershell -Command "try { $body = @{model='nexa-os'; prompt='Responde con una sola palabra: OK'; stream=$false} | ConvertTo-Json; $r = Invoke-WebRequest -Uri 'http://localhost:11434/api/generate' -Method POST -Body $body -ContentType 'application/json' -TimeoutSec 30; $response = ($r.Content | ConvertFrom-Json).response; Write-Host ('✅ nexa-os responds: ' + $response) } catch { Write-Host ('❌ nexa-os test failed: ' + $_.Exception.Message) }"
```
