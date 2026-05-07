Write-Host "Iniciando Ollama en Docker..." -ForegroundColor Cyan
docker-compose up -d

Write-Host "Esperando a que el contenedor esté listo..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

Write-Host "Descargando y ejecutando Qwen 3.5..." -ForegroundColor Green
docker exec -it ollama ollama run qwen3.5
