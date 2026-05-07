# Nexa VS Code 🚀

Extensión avanzada de VS Code para usar `Nexa` como tu **Agente Principal** de programación.

## Características

- **IA Híbrida**: Soporte para Ollama (local) y **NVIDIA NIM (Llama 3.1 405B)**.
- **Micro-Backend Inteligente**: Orquestación de modelos desde tu propia máquina.
- **Comandos de Contexto**: Revisión de archivos, explicación de código y más.
- **Captura de Pantalla y Audio**: (Vía scripts locales).

## Cómo empezar

1. **Instalar la extensión**: Instala el archivo `nexa.vsix` desde el panel de extensiones.
2. **Encender el Cerebro**:
   ```bash
   npm run vscode:backend
   ```
3. **Usar el panel**: Abre el icono de Nexa en la barra lateral y elige tu modelo (recomendamos NVIDIA Ultra 405B).

## Configuración

- `nexa.backendUrl`: URL del micro-backend (default `http://localhost:3001`)
- `nexa.userId`: Tu identificador único para sincronización.

