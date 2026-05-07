# Nexa Cloud Keep-Alive Script
# Este script evita que tu servidor de Hugging Face entre en modo "Sleep"

$hf_url = (Get-Content .env | Select-String "VITE_OLLAMA_URL").ToString().Split('=')[1].Trim()

if (-not $hf_url) {
    Write-Host "⚠️ No se encontró VITE_OLLAMA_URL en el archivo .env" -ForegroundColor Yellow
    exit
}

Write-Host "🚀 Iniciando Nexa Guardián para: $hf_url" -ForegroundColor Cyan
Write-Host "Presiona Ctrl+C para detener"

while($true) {
    try {
        $timestamp = Get-Date -Format "HH:mm:ss"
        Write-Host "[$timestamp] Enviando pulso de vida a la nube..." -NoNewline
        $response = Invoke-WebRequest -Uri "$hf_url/api/tags" -Method Get -TimeoutSec 10
        if ($response.StatusCode -eq 200) {
            Write-Host " OK (Online)" -ForegroundColor Green
        } else {
            Write-Host " Error ($($response.StatusCode))" -ForegroundColor Red
        }
    } catch {
        Write-Host " Despertando..." -ForegroundColor Yellow
    }
    
    # Esperar 40 minutos (HF duerme a las 48h de inactividad, pero esto asegura latencia baja)
    Start-Sleep -Seconds 2400
}
