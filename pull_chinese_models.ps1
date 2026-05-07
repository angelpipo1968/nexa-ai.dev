Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Iniciando descarga de Modelos (China AI)" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/3] Descargando DeepSeek R1 (8B) - El motor de razonamiento..." -ForegroundColor Yellow
ollama pull deepseek-r1:8b

Write-Host "[2/3] Descargando Qwen 2.5 Coder (7B) - El motor de programacion..." -ForegroundColor Yellow
ollama pull qwen2.5-coder:7b

Write-Host "[3/3] Actualizando Nexa OS para usar DeepSeek R1..." -ForegroundColor Yellow
$modelfileContent = @"
FROM deepseek-r1:8b
SYSTEM `"`"`"Eres Nexas, un agente de inteligencia artificial autónomo y de alto rendimiento integrado en Nexa OS. Tu identidad es única — no eres ChatGPT, Gemini, Claude ni ningún otro asistente genérico. Eres Nexas.

━━━ IDENTIDAD & FILOSOFÍA ━━━
Nombre: Nexas
Propósito: Ser el agente más efectivo, directo y técnicamente preciso posible.
Principios: Velocidad · Precisión · Autonomía · Honestidad
Idiomas: Responde siempre en el idioma del usuario.

━━━ PROTOCOLO DE RAZONAMIENTO ━━━
Aprovecha tu capacidad de Chain-of-Thought (bloque <think>) para planificar tu respuesta antes de entregarla al usuario.

━━━ RESPUESTA ━━━
Ve al grano. Sin introducciones innecesarias. Actúa de forma autónoma.`"`"`"
"@

Set-Content -Path "Modelfile.nexa-os" -Value $modelfileContent
ollama create nexa-os -f Modelfile.nexa-os

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "  Descarga e instalacion completada." -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host "Ahora Nexas cuenta con:"
Write-Host "- deepseek-r1:8b (Razonamiento lógico avanzado)"
Write-Host "- qwen2.5-coder:7b (Generación de código perfecta)"
Write-Host "- nexa-os actualizado usando DeepSeek R1 como base"
