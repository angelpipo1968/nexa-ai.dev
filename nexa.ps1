# NEXA OS v3.0 - Dashboard de Gestion (PowerShell)

param (
    [string]$Action = "help",
    [string]$Domain = "https://nexa-os.railway.app",
    [string]$Branch = "main",
    [int]$WaitTime = 90
)

function Show-Help {
    Write-Host "`n🔧 NEXA Deployment Dashboard (Windows)" -ForegroundColor Cyan
    Write-Host "Uso: .\nexa.ps1 -Action <target> [-Domain <url>] [-Branch <name>] [-WaitTime <sec>]"
    Write-Host ""
    Write-Host "Targets:"
    Write-Host "  install     - Prepara el entorno y hooks"
    Write-Host "  validate    - Ejecuta validacion pre-deploy"
    Write-Host "  push        - Commit + push a GitHub"
    Write-Host "  check       - Health check post-despliegue"
    Write-Host "  deploy      - Flujo completo: validate -> push -> wait -> check"
    Write-Host "  status      - Check rapido contra dominio actual"
    Write-Host "  clean       - Limpia caches Python"
    Write-Host "-------------------------------`n"
}

if ($Action -eq "install") {
    Write-Host "[INSTALL] Instalando dependencias y hooks..." -ForegroundColor Blue
    pip install -r requirements.txt
    pip install requests
    python scripts/install_hooks.py
    Write-Host "[OK] Entorno listo." -ForegroundColor Green
}
elseif ($Action -eq "validate") {
    python scripts/pre_deploy_validator.py
}
elseif ($Action -eq "push") {
    Write-Host "[PUSH] Preparando push a $Branch..." -ForegroundColor Yellow
    git add .
    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    git commit -m "chore: deploy NEXA $timestamp"
    git push origin $Branch
}
elseif ($Action -eq "check" -or $Action -eq "status") {
    python scripts/post_deploy_check.py $Domain
}
elseif ($Action -eq "deploy") {
    # 1. Validar
    python scripts/pre_deploy_validator.py
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Validacion fallida. Abortando." -ForegroundColor Red
        exit 1
    }
    
    # 2. Push
    Write-Host "[PUSH] Preparando push a $Branch..." -ForegroundColor Yellow
    git add .
    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    git commit -m "chore: deploy NEXA $timestamp"
    git push origin $Branch
    
    # 3. Wait
    Write-Host "[WAIT] Esperando $WaitTime s para que el container arranque..." -ForegroundColor Gray
    Start-Sleep -Seconds $WaitTime
    
    # 4. Check
    python scripts/post_deploy_check.py $Domain
}
elseif ($Action -eq "clean") {
    Write-Host "[CLEAN] Limpiando caches Python..." -ForegroundColor Blue
    Get-ChildItem -Path . -Filter __pycache__ -Recurse | Remove-Item -Force -Recurse
    Get-ChildItem -Path . -Filter *.pyc -Recurse | Remove-Item -Force
    Write-Host "[OK] Limpieza completada." -ForegroundColor Green
}
else {
    Show-Help
}
