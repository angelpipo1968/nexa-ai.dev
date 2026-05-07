// ═══════════════════════════════════════════
//  NEXA CORE — Sistema de Herramientas
// ═══════════════════════════════════════════

export interface ToolResult {
    success: boolean;
    output: string;
    error?: string;
}

// ─── Ejecución de Código ───
export async function executeCode(language: string, code: string): Promise<ToolResult> {
    try {
        // For safety, we only "simulate" execution and return analysis
        // In production, this would connect to a sandboxed runner
        const analysis = analyzeCode(language, code);
        return { success: true, output: analysis };
    } catch (e: any) {
        return { success: false, output: '', error: e.message };
    }
}

function analyzeCode(language: string, code: string): string {
    const lines = code.split('\n').length;
    const hasComments = code.includes('//') || code.includes('#') || code.includes('/*');
    const hasErrorHandling = code.includes('try') || code.includes('catch') || code.includes('except');
    const hasTypes = code.includes(': string') || code.includes(': number') || code.includes('interface ') || code.includes('type ');
    
    let analysis = `📊 **Análisis del código** (${language}, ${lines} líneas)\n\n`;
    
    if (hasComments) analysis += '✅ Tiene comentarios — bien documentado\n';
    else analysis += '⚠️ Sin comentarios — considera documentar partes clave\n';
    
    if (hasErrorHandling) analysis += '✅ Manejo de errores presente\n';
    else analysis += '⚠️ Sin manejo de errores — considera try/catch\n';
    
    if (hasTypes && (language === 'typescript' || language === 'ts')) {
        analysis += '✅ Tipado estático presente\n';
    }
    
    return analysis;
}

// ─── Generación de HTML/Web ───
export function generateHTML(description: string): string {
    // Parse the description to generate a meaningful HTML page
    const isLanding = description.toLowerCase().includes('landing') || description.toLowerCase().includes('página principal');
    const isPortfolio = description.toLowerCase().includes('portfolio') || description.toLowerCase().includes('portafolio');
    const isDashboard = description.toLowerCase().includes('dashboard') || description.toLowerCase().includes('panel');
    
    if (isLanding) return generateLandingPage(description);
    if (isPortfolio) return generatePortfolioPage(description);
    if (isDashboard) return generateDashboardPage(description);
    return generateGenericPage(description);
}

function generateLandingPage(desc: string): string {
    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>NEXA Landing</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', -apple-system, sans-serif; background: #0a0a0a; color: #f0f0f0; }
        .hero { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 2rem; background: linear-gradient(135deg, #0a0a0a 0%, #1a0a2e 50%, #0a1a2e 100%); }
        .hero h1 { font-size: clamp(2.5rem, 6vw, 4.5rem); font-weight: 800; letter-spacing: -2px; line-height: 1.1; margin-bottom: 1.5rem; background: linear-gradient(135deg, #00e5a0, #a855f7); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .hero p { font-size: 1.25rem; color: #888; max-width: 600px; line-height: 1.6; margin-bottom: 2rem; }
        .cta { display: inline-flex; align-items: center; gap: 8px; padding: 16px 32px; border-radius: 50px; background: linear-gradient(135deg, #00e5a0, #a855f7); color: #000; font-weight: 700; font-size: 1.1rem; text-decoration: none; transition: transform 0.2s, box-shadow 0.2s; }
        .cta:hover { transform: translateY(-2px); box-shadow: 0 10px 40px rgba(0,229,160,0.3); }
        .features { padding: 6rem 2rem; max-width: 1200px; margin: 0 auto; display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 2rem; }
        .feature { background: #111; border: 1px solid #222; border-radius: 16px; padding: 2rem; transition: border-color 0.3s; }
        .feature:hover { border-color: #00e5a040; }
        .feature h3 { font-size: 1.25rem; margin-bottom: 0.75rem; color: #00e5a0; }
        .feature p { color: #888; line-height: 1.6; }
        footer { text-align: center; padding: 3rem; color: #555; border-top: 1px solid #222; }
    </style>
</head>
<body>
    <section class="hero">
        <h1>Tu Visión, Nuestro Código</h1>
        <p>Transformamos ideas en experiencias digitales extraordinarias. Diseño moderno, tecnología de vanguardia.</p>
        <a href="#contact" class="cta">Comenzar →</a>
    </section>
    <section class="features">
        <div class="feature">
            <h3>⚡ Rendimiento</h3>
            <p>Cargas ultrarrápidas y optimización en cada pixel. Tu sitio será instantáneo.</p>
        </div>
        <div class="feature">
            <h3>🎨 Diseño Premium</h3>
            <p>Interfaces modernas que enamoran. Cada detalle cuenta para tu marca.</p>
        </div>
        <div class="feature">
            <h3>📱 Responsive</h3>
            <p>Perfecto en desktop, tablet y móvil. Sin compromisos en ningún dispositivo.</p>
        </div>
    </section>
    <footer>
        <p>Creado con ❤️ por NEXA AI</p>
    </footer>
</body>
</html>`;
}

function generatePortfolioPage(desc: string): string {
    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Portfolio — NEXA</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', sans-serif; background: #000; color: #e0e0e0; }
        nav { position: fixed; top: 0; width: 100%; padding: 1.5rem 2rem; display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.8); backdrop-filter: blur(20px); z-index: 100; }
        nav .logo { font-weight: 800; font-size: 1.5rem; letter-spacing: -1px; }
        nav .links a { color: #888; text-decoration: none; margin-left: 2rem; font-size: 0.9rem; transition: color 0.3s; }
        nav .links a:hover { color: #00e5a0; }
        .hero { min-height: 100vh; display: flex; align-items: center; padding: 8rem 2rem 4rem; max-width: 1200px; margin: 0 auto; }
        .hero-content { max-width: 600px; }
        .hero h1 { font-size: 4rem; font-weight: 800; line-height: 1.1; letter-spacing: -3px; margin-bottom: 1.5rem; }
        .hero h1 span { color: #00e5a0; }
        .hero p { font-size: 1.2rem; color: #888; line-height: 1.7; margin-bottom: 2rem; }
        .projects { padding: 4rem 2rem; max-width: 1200px; margin: 0 auto; }
        .projects h2 { font-size: 2rem; margin-bottom: 3rem; letter-spacing: -1px; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 2rem; }
        .project { position: relative; border-radius: 16px; overflow: hidden; aspect-ratio: 16/10; background: #111; border: 1px solid #222; transition: transform 0.3s; cursor: pointer; }
        .project:hover { transform: scale(1.02); }
        .project .overlay { position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,0.9), transparent); display: flex; flex-direction: column; justify-content: flex-end; padding: 2rem; }
        .project h3 { font-size: 1.5rem; margin-bottom: 0.5rem; }
        .project p { color: #888; font-size: 0.9rem; }
        .tags { display: flex; gap: 0.5rem; margin-top: 1rem; flex-wrap: wrap; }
        .tag { padding: 4px 12px; border-radius: 20px; background: rgba(0,229,160,0.1); color: #00e5a0; font-size: 0.75rem; border: 1px solid rgba(0,229,160,0.2); }
    </style>
</head>
<body>
    <nav>
        <div class="logo">Portfolio</div>
        <div class="links">
            <a href="#projects">Proyectos</a>
            <a href="#about">Sobre mí</a>
            <a href="#contact">Contacto</a>
        </div>
    </nav>
    <section class="hero">
        <div class="hero-content">
            <h1>Hola, soy <span>Desarrollador</span></h1>
            <p>Creo experiencias digitales que combinan diseño elegante con código limpio. Especializado en desarrollo web moderno y aplicaciones innovadoras.</p>
        </div>
    </section>
    <section class="projects" id="projects">
        <h2>Proyectos Destacados</h2>
        <div class="grid">
            <div class="project" style="background: linear-gradient(135deg, #1a1a2e, #16213e);">
                <div class="overlay">
                    <h3>Proyecto Alpha</h3>
                    <p>Aplicación web full-stack con IA integrada</p>
                    <div class="tags"><span class="tag">React</span><span class="tag">Node.js</span><span class="tag">AI</span></div>
                </div>
            </div>
            <div class="project" style="background: linear-gradient(135deg, #0f3460, #16213e);">
                <div class="overlay">
                    <h3>Proyecto Beta</h3>
                    <p>Dashboard de analytics en tiempo real</p>
                    <div class="tags"><span class="tag">Next.js</span><span class="tag">D3.js</span><span class="tag">WebSocket</span></div>
                </div>
            </div>
            <div class="project" style="background: linear-gradient(135deg, #1a1a2e, #0f3460);">
                <div class="overlay">
                    <h3>Proyecto Gamma</h3>
                    <p>E-commerce con recomendaciones inteligentes</p>
                    <div class="tags"><span class="tag">TypeScript</span><span class="tag">Stripe</span><span class="tag">ML</span></div>
                </div>
            </div>
        </div>
    </section>
</body>
</html>`;
}

function generateDashboardPage(desc: string): string {
    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard — NEXA</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', sans-serif; background: #09090b; color: #f0f0f0; display: flex; min-height: 100vh; }
        .sidebar { width: 260px; background: #111; border-right: 1px solid #222; padding: 1.5rem; flex-shrink: 0; }
        .sidebar .logo { font-weight: 800; font-size: 1.3rem; margin-bottom: 2rem; color: #00e5a0; }
        .sidebar nav a { display: flex; align-items: center; gap: 12px; padding: 12px; border-radius: 10px; color: #888; text-decoration: none; margin-bottom: 4px; transition: all 0.2s; }
        .sidebar nav a:hover, .sidebar nav a.active { background: rgba(0,229,160,0.1); color: #00e5a0; }
        .main { flex: 1; padding: 2rem; overflow-y: auto; }
        .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
        .header h1 { font-size: 1.5rem; font-weight: 700; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
        .stat { background: #111; border: 1px solid #222; border-radius: 12px; padding: 1.5rem; }
        .stat .label { font-size: 0.85rem; color: #888; margin-bottom: 0.5rem; }
        .stat .value { font-size: 2rem; font-weight: 800; letter-spacing: -1px; }
        .stat .change { font-size: 0.8rem; color: #00e5a0; margin-top: 0.25rem; }
        .chart { background: #111; border: 1px solid #222; border-radius: 12px; padding: 1.5rem; height: 300px; display: flex; align-items: flex-end; gap: 8px; }
        .bar { flex: 1; background: linear-gradient(to top, #00e5a0, #a855f7); border-radius: 6px 6px 0 0; min-height: 20px; transition: height 0.5s; }
    </style>
</head>
<body>
    <aside class="sidebar">
        <div class="logo">⚡ Dashboard</div>
        <nav>
            <a href="#" class="active">📊 Overview</a>
            <a href="#">👥 Usuarios</a>
            <a href="#">💰 Ventas</a>
            <a href="#">📈 Analytics</a>
            <a href="#">⚙️ Configuración</a>
        </nav>
    </aside>
    <main class="main">
        <div class="header">
            <h1>Overview</h1>
            <span style="color:#888">Últimos 30 días</span>
        </div>
        <div class="stats">
            <div class="stat">
                <div class="label">Usuarios Activos</div>
                <div class="value">12,847</div>
                <div class="change">↑ +12.5%</div>
            </div>
            <div class="stat">
                <div class="label">Ingresos</div>
                <div class="value">$48,290</div>
                <div class="change">↑ +8.2%</div>
            </div>
            <div class="stat">
                <div class="label">Conversión</div>
                <div class="value">3.24%</div>
                <div class="change">↑ +0.8%</div>
            </div>
            <div class="stat">
                <div class="label">Satisfacción</div>
                <div class="value">4.8/5</div>
                <div class="change">↑ +0.3</div>
            </div>
        </div>
        <div class="chart">
            <div class="bar" style="height:60%"></div>
            <div class="bar" style="height:45%"></div>
            <div class="bar" style="height:75%"></div>
            <div class="bar" style="height:55%"></div>
            <div class="bar" style="height:85%"></div>
            <div class="bar" style="height:70%"></div>
            <div class="bar" style="height:90%"></div>
            <div class="bar" style="height:65%"></div>
            <div class="bar" style="height:80%"></div>
            <div class="bar" style="height:95%"></div>
            <div class="bar" style="height:72%"></div>
            <div class="bar" style="height:88%"></div>
        </div>
    </main>
</body>
</html>`;
}

function generateGenericPage(desc: string): string {
    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>NEXA — Generado por IA</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', sans-serif; background: #0a0a0a; color: #e0e0e0; min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 2rem; }
        .container { max-width: 800px; text-align: center; }
        h1 { font-size: 3rem; font-weight: 800; letter-spacing: -2px; margin-bottom: 1rem; background: linear-gradient(135deg, #00e5a0, #3b82f6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        p { font-size: 1.2rem; color: #888; line-height: 1.7; margin-bottom: 2rem; }
        .content { text-align: left; background: #111; border: 1px solid #222; border-radius: 16px; padding: 2rem; margin-top: 2rem; }
        .content h2 { color: #00e5a0; margin-bottom: 1rem; }
        .content p { font-size: 1rem; color: #aaa; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Página Generada por NEXA</h1>
        <p>Esta página fue creada por inteligencia artificial basándose en tu descripción.</p>
        <div class="content">
            <h2>Contenido</h2>
            <p>Edita este HTML para personalizar tu página. NEXA puede ayudarte a modificar cualquier sección.</p>
        </div>
    </div>
</body>
</html>`;
}

// ─── Análisis de Imágenes ───
export function buildVisionMessages(imageBase64: string, mimeType: string, userQuestion?: string): any[] {
    return [
        {
            role: 'user',
            content: [
                {
                    type: 'text',
                    text: userQuestion || 'Analiza esta imagen en detalle. Describe todo lo que ves, identifica problemas o oportunidades, y da recomendaciones específicas.'
                },
                {
                    type: 'image_url',
                    image_url: {
                        url: `data:${mimeType};base64,${imageBase64}`
                    }
                }
            ]
        }
    ];
}

// ─── Detección de Intención ───
export type UserIntent = 
    | { type: 'code'; language?: string; description: string }
    | { type: 'web'; description: string }
    | { type: 'design'; description: string }
    | { type: 'analysis'; subject: string }
    | { type: 'vision'; hasImage: boolean }
    | { type: 'chat'; message: string };

export function detectIntent(message: string): UserIntent {
    const lower = message.toLowerCase();
    
    if (lower.includes('código') || lower.includes('codigo') || lower.includes('code') || 
        lower.includes('función') || lower.includes('script') || lower.includes('programa') ||
        lower.includes('api') || lower.includes('endpoint')) {
        const langMatch = message.match(/(?:python|javascript|typescript|react|html|css|sql|go|rust|java|c\+\+)/i);
        return { type: 'code', language: langMatch?.[0]?.toLowerCase(), description: message };
    }
    
    if (lower.includes('página web') || lower.includes('pagina web') || lower.includes('website') || 
        lower.includes('landing') || lower.includes('portfolio') || lower.includes('sitio web')) {
        return { type: 'web', description: message };
    }
    
    if (lower.includes('diseño') || lower.includes('logo') || lower.includes('ui') || 
        lower.includes('ux') || lower.includes('interfaz') || lower.includes('mockup')) {
        return { type: 'design', description: message };
    }
    
    if (lower.includes('analiza') || lower.includes('analice') || lower.includes('explica') || 
        lower.includes('por qué') || lower.includes('por que') || lower.includes('cómo funciona')) {
        return { type: 'analysis', subject: message };
    }
    
    return { type: 'chat', message };
}
