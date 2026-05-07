# Ollama Docker Bridge & Launcher
# Este script permite usar el comando 'ollama' directamente, redirigiendo a Docker
# e implementando comandos extendidos como 'launch'.

param(
    [Parameter(Position=0)]
    $Command,

    [Parameter(ValueFromRemainingArguments=$true)]
    $RemainingArgs
)

function Show-Help {
    Write-Host "`n🚀 Ollama Nexa Launcher" -ForegroundColor Cyan
    Write-Host "Uso: .\ollama.ps1 <comando> [opciones]"
    Write-Host ""
    Write-Host "Comandos Estándar (Redirigidos a Docker):"
    Write-Host "  run <model>     - Ejecuta un modelo"
    Write-Host "  list            - Lista modelos instalados"
    Write-Host "  pull <model>    - Descarga un modelo"
    Write-Host ""
    Write-Host "Comandos Extendidos:"
    Write-Host "  launch <app> --model <base>  - Lanza una 'app' o persona específica"
    Write-Host "    Apps: claude, codex, openclaw, opencode, hermes, nexa-ultra"
    Write-Host "-------------------------------`n"
}

if (-not $Command -or $Command -eq "help") {
    Show-Help
    exit
}

# Verificar si el contenedor está corriendo
$containerStatus = docker inspect -f '{{.State.Running}}' ollama 2>$null
if ($containerStatus -ne "true") {
    Write-Host "⚠️ El contenedor 'ollama' no está corriendo. Iniciándolo..." -ForegroundColor Yellow
    docker-compose -f c:\nexa\ollama-docker\docker-compose.yml up -d
    Start-Sleep -Seconds 2
}

if ($Command -eq "launch") {
    $app = $RemainingArgs[0]
    $baseModel = "qwen3.5"
    
    # Buscar flag --model
    for ($i = 0; $i -lt $RemainingArgs.Count; $i++) {
        if ($RemainingArgs[$i] -eq "--model" -and ($i + 1) -lt $RemainingArgs.Count) {
            $baseModel = $RemainingArgs[$i+1]
        }
    }

    Write-Host "🚀 Lanzando persona '$app' basada en $baseModel..." -ForegroundColor Green

    # Asegurar que el modelo base existe
    Write-Host "🔍 Verificando modelo base $baseModel..." -ForegroundColor Gray
    docker exec ollama ollama pull $baseModel
    $systemPrompt = ""
    switch ($app) {
        "claude" {
            $systemPrompt = "Eres una inteligencia artificial altamente capaz, honesta y útil. Tu estilo de respuesta es refinado, detallado y reflexivo, similar a Claude."
        }
        "codex" {
            $systemPrompt = "Eres un experto ingeniero de software. Tu objetivo es escribir código limpio, eficiente y bien documentado. Resuelves problemas complejos con elegancia."
        }
        "openclaw" {
            # Intentar leer el Modelfile existente en .openclaw
            $userModelfile = "c:\Users\pipog\.openclaw\Modelfile"
            if (Test-Path $userModelfile) {
                $content = Get-Content $userModelfile -Raw
                # Extraer el SYSTEM prompt usando regex
                if ($content -match 'SYSTEM """([\s\S]*?)"""') {
                    $systemPrompt = $matches[1].Trim()
                } else {
                    $systemPrompt = "Tu nombre es Nexas. Eres un sistema de inteligencia artificial de alto rendimiento."
                }
            } else {
                $systemPrompt = "Tu nombre es Nexas. Eres un sistema de inteligencia artificial de alto rendimiento diseñado para operar de forma autónoma y local."
            }
        }
        "opencode" {
            $systemPrompt = "Eres OpenCode, un especialista en generación de código y refactorización. Priorizas la velocidad y la corrección técnica."
        }
        "hermes" {
            $systemPrompt = "Eres Hermes, un modelo de razonamiento avanzado. Tu objetivo es ser extremadamente preciso, seguir instrucciones al pie de la letra y proporcionar explicaciones lógicas profundas."
        }
        "nexa-ultra" {
            $systemPrompt = "Eres Nexa-Ultra, la evolución definitiva de Nexas. Eres un arquitecto de sistemas de nivel senior y un experto en IA. Tu razonamiento es multi-paso, siempre verificas la seguridad del código y optimizas el rendimiento. Hablas de forma profesional, clara y directa. Eres capaz de gestionar proyectos enteros de forma autónoma."
        }
        default {
            $systemPrompt = "Eres un asistente de IA útil."
        }
    }

    # Crear Modelfile usando un archivo temporal para mayor robustez
    $tempHostPath = "$env:TEMP\Modelfile.$app"
    $modelfileContent = "FROM $baseModel`nSYSTEM `\"`\"`\"$systemPrompt`\"`\"`\""
    $modelfileContent | Out-File -FilePath $tempHostPath -Encoding utf8
    
    $modelfileContainerPath = "/tmp/Modelfile.$app"
    docker cp $tempHostPath "ollama:$modelfileContainerPath"
    
    Write-Host "🔨 Preparando modelo '$app'..." -ForegroundColor Gray
    docker exec ollama ollama create $app -f $modelfileContainerPath > $null
    
    # Limpiar
    Remove-Item $tempHostPath -ErrorAction SilentlyContinue

    Write-Host "✨ Iniciando sesión con $app..." -ForegroundColor Green
    docker exec -it ollama ollama run $app
}
else {
    # Comando normal, pasar a docker
    $allArgs = @($Command) + $RemainingArgs
    docker exec -it ollama ollama $allArgs
}
