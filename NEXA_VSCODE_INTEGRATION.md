# Integración de Nexa en VS Code 🚀

Ahora puedes usar **Nexa** como el motor de inteligencia artificial dentro de VS Code, permitiéndole razonar sobre tu código, realizar búsquedas profundas y ejecutar herramientas, tal como lo hace Gemini o Copilot.

## 1. Activación del Motor Nexa
He creado un "puente" (OpenAI Bridge) en el servidor de Nexa que permite que cualquier extensión de VS Code se comunique con él.

**Requisitos:**
- Tener el servidor de Nexa corriendo (Puerto 3001).
- Instalar la extensión **Cline** o **Continue** en VS Code.

## 2. Configuración en VS Code (Cline)
Si usas **Cline** (altamente recomendado), configúralo así:

1. Abre los ajustes de Cline en VS Code.
2. En **API Provider**, selecciona: `OpenAI Compatible`.
3. Configura los siguientes campos:
   - **Base URL**: `https://api.nexa-ai.dev/v1`
   - **API Key**: `nexa-unlocked` (puedes poner cualquier cosa, el bridge local no la valida).
   - **Model ID**: `nexa-balanced` o `nexa-deep`.

## 3. Configuración en VS Code (Continue)
Si usas **Continue**, añade esto a tu `config.json`:

```json
{
  "models": [
    {
      "title": "Nexa Engine",
      "provider": "openai",
      "model": "nexa-balanced",
      "apiKey": "nexa",
      "apiBase": "https://api.nexa-ai.dev/v1"
    }
  ]
}
```

## 4. Uso de Herramientas (MCP)
Nexa también actúa como un servidor **MCP (Model Context Protocol)**. Puedes configurar VS Code para que use las herramientas nativas de Nexa (búsqueda profunda, análisis de personajes, etc.):

Añade esto a tu configuración de MCP en VS Code:

```json
{
  "mcpServers": {
    "nexa-engine": {
      "command": "npx",
      "args": [
        "tsx",
        "c:/nexa/apps/api/src/mcp/nexa-server.ts"
      ]
    }
  }
}
```

---
**¿Qué puede hacer Nexa en VS Code?**
- **Refactorización de código**: "Nexa, optimiza esta función usando patrones de diseño modernos."
- **Búsqueda Técnica**: "Nexa, busca en internet la última documentación de esta librería y aplícala aquí."
- **Omni-Vision**: Si usas la versión móvil de Nexa vinculada, puedes capturar errores de tu pantalla y enviarlos directamente al VS Code.
