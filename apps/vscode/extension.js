const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

function log(msg) {
    try {
        const logPath = path.join(__dirname, 'extension_log.txt');
        fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${msg}\n`);
        console.log(`[Nexa] ${msg}`);
    } catch (e) {}
}

class NexaViewProvider {
    constructor(context) {
        this.context = context;
        this.view = undefined;
        this.history = [];
    }

    show() {
        if (this.view) {
            this.view.show(true);
        } else {
            vscode.commands.executeCommand('nexa.chatView.focus');
        }
    }

    resolveWebviewView(webviewView) {
        this.view = webviewView;
        webviewView.webview.options = { 
            enableScripts: true, 
            localResourceRoots: [this.context.extensionUri]
        };
        
        webviewView.webview.html = this.getHtml(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(async (message) => {
            log(`Message: ${message.type}`);
            switch (message.type) {
                case 'ready': 
                    this.loadModels(); 
                    this.view?.webview.postMessage({ 
                        type: 'message', 
                        role: 'assistant', 
                        text: '✨ **Nexa Antigravity** está activo. ¿Cómo puedo ayudarte hoy?' 
                    });
                    break;
                case 'loadModels': this.loadModels(); break;
                case 'send':
                    await this.handlePrompt(message.value, message);
                    break;
                case 'startServer':
                    this.startLocalServer();
                    break;
                case 'action':
                    await this.handleAction(message.name);
                    break;
                case 'log':
                    log(`Webview: ${message.value}`);
                    break;
            }
        });
    }

    startLocalServer() {
        try {
            const serverPath = path.join(this.context.extensionPath, 'server.js');
            const terminal = vscode.window.createTerminal('Nexa Backend');
            terminal.show();
            terminal.sendText(`node "${serverPath}"`);
            
            this.view?.webview.postMessage({ 
                type: 'message', 
                role: 'assistant', 
                text: '🚀 Intentando iniciar el Micro-Backend local en una nueva terminal...' 
            });
            
            setTimeout(() => this.loadModels(), 3000);
        } catch (e) {
            vscode.window.showErrorMessage('Error al iniciar servidor: ' + e.message);
        }
    }

    async loadModels() {
        try {
            const config = vscode.workspace.getConfiguration();
            const baseUrl = config.get('nexa.backendUrl') || 'http://localhost:3001';
            
            const res = await fetch(`${baseUrl}/api/models`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            this.view?.webview.postMessage({ type: 'models', models: data.models || [] });
            log('Models loaded.');
        } catch (e) {
            log(`Models error: ${e.message}`);
            // Fallback default models if server is down
            this.view?.webview.postMessage({ type: 'models', models: [
                { id: 'gemini-1.5-flash', name: 'Nexa Fast (Fallback)' }
            ]});
        }
    }

    async handlePrompt(prompt, options = {}) {
        if (!prompt && (!options.images || options.images.length === 0)) return;
        this.view?.webview.postMessage({ type: 'loading', value: true });
        
        try {
            const config = vscode.workspace.getConfiguration();
            const baseUrl = config.get('nexa.backendUrl') || 'http://localhost:3001';
            const userId = config.get('nexa.userId') || 'vscode-user';

            const payload = {
                message: prompt,
                userId: userId,
                provider: options.modelId?.includes(':') ? 'ollama' : (options.provider || 'google'),
                mode: options.mode || 'reviewer',
                modelId: options.modelId,
                images: options.images || [],
                audio: options.audio
            };

            const res = await fetch(`${baseUrl}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            const text = data.response || data.reply || 'Sin respuesta.';
            
            this.history.push({ role: 'assistant', text });
            this.view?.webview.postMessage({ type: 'message', role: 'assistant', text });

        } catch (e) {
            log(`Chat Error: ${e.message}`);
            const errorMsg = `❌ **Error de Conexión**: No se pudo contactar con el Micro-Backend local. 
            
**Sugerencia**:
1. Asegúrate de que el servidor esté corriendo en \`http://localhost:3001\`.
2. Ejecuta \`node apps/vscode/server.js\` en la terminal de Nexa.
3. Verifica la URL en los ajustes de VS Code (\`nexa.backendUrl\`).`;
            
            this.view?.webview.postMessage({ 
                type: 'message', 
                role: 'assistant', 
                text: errorMsg 
            });
        } finally {
            this.view?.webview.postMessage({ type: 'loading', value: false });
        }
    }

    async handleAction(name) {
        log(`Action: ${name}`);
        if (name === 'vision') {
            try {
                const scriptPath = path.join('c:', 'nexa', 'scripts', 'capture.ps1');
                cp.execSync(`powershell -ExecutionPolicy Bypass -File "${scriptPath}"`);
                const b64 = fs.readFileSync('c:\\nexa\\temp\\screen.png', 'base64');
                this.view?.webview.postMessage({ type: 'visionData', image: `data:image/png;base64,${b64}` });
            } catch (e) {
                vscode.window.showErrorMessage('Error Visión: ' + e.message);
            }
        } else if (name === 'mic') {
            try {
                this.view?.webview.postMessage({ type: 'message', role: 'assistant', text: '🎤 Grabando audio (5 segundos)...' });
                const scriptPath = path.join('c:', 'nexa', 'scripts', 'record_audio.ps1');
                cp.execSync(`powershell -ExecutionPolicy Bypass -File "${scriptPath}"`);
                const audioPath = 'c:\\nexa\\temp\\voice.wav';
                if (fs.existsSync(audioPath)) {
                    const b64 = fs.readFileSync(audioPath, 'base64');
                    this.view?.webview.postMessage({ type: 'message', role: 'assistant', text: '⌛ Procesando comando de voz...' });
                    await this.handlePrompt('Comando de voz recibido', { audio: b64 });
                } else {
                    throw new Error('No se generó el archivo de audio.');
                }
            } catch (e) {
                vscode.window.showErrorMessage('Error Micrófono: ' + e.message);
            }
        }
    }

    getHtml(webview) {
        const templatePath = path.join(this.context.extensionPath, 'extension_template.html');
        const iconPath = vscode.Uri.file(path.join(this.context.extensionPath, 'media', 'nexa.svg'));
        const iconUri = webview.asWebviewUri(iconPath);
        
        try {
            let html = fs.readFileSync(templatePath, 'utf8');
            return html.replace(/\${iconUri}/g, iconUri.toString());
        } catch (e) {
            return `<html><body><h1>Error al cargar la interfaz</h1><p>${e.message}</p></body></html>`;
        }
    }
}

// I'll create a separate HTML template to keep extension.js clean
function activate(context) {
    log('Extension Activating...');
    const provider = new NexaViewProvider(context);
    
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('nexa.chatView', provider)
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('nexa.openChat', () => {
            vscode.commands.executeCommand('nexa.chatView.focus');
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('nexa.explainSelection', () => {
            const editor = vscode.window.activeTextEditor;
            if (editor) {
                const selection = editor.document.getText(editor.selection);
                if (selection) {
                    provider.show();
                    provider.handlePrompt(`Explica este código:\n\n\`\`\`\n${selection}\n\`\`\``);
                }
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('nexa.reviewActiveFile', () => {
            const editor = vscode.window.activeTextEditor;
            if (editor) {
                const code = editor.document.getText();
                provider.show();
                provider.handlePrompt(`Haz una revisión de este archivo:\n\n\`\`\`\n${code}\n\`\`\``);
            }
        })
    );

    log('Extension Registered.');
}

module.exports = { activate };
