# Sincronización con GitHub y Vercel

Tu proyecto `nexa-os` está listo. Sigue estos pasos para subirlo a la nube.

## 1. GitHub (Subir el código)
Si tienes GitHub Desktop o la terminal configurada:

1.  Abre una terminal en la carpeta del proyecto:
    ```bash
    cd c:\Users\pipog\.gemini\antigravity\playground\drifting-gemini\nexa-os
    ```
2.  Crea el repositorio y sube el código:
    ```bash
    git add .
    git commit -m "Initial commit: NEXA OS v2 con Chat y Voz"
    # Si tienes GH CLI:
    gh repo create nexa-os --public --source=. --remote=origin --push
    # Si NO tienes GH CLI, crea el repo en github.com y luego corre:
    # git remote add origin https://github.com/TU_USUARIO/nexa-os.git
    # git branch -M main
    # git push -u origin main
    ```

## 2. Vercel (Desplegar)
La forma más fácil es usando la CLI de Vercel.

1.  Instala Vercel CLI (si no la tienes):
    ```bash
    npm i -g vercel
    ```
2.  Despliega con un comando:
    ```bash
    vercel
    ```
    - Sigue las instrucciones en pantalla (Login, Link to Project: Yes, etc.).
    - Cuando te pida "Framework Preset", detectará **Next.js** automáticamente.

## 3. Configurar API Keys (Importante)
Para que el chat funcione en producción:
1.  Ve al dashboard de tu proyecto en Vercel.
2.  Ve a **Settings -> Environment Variables**.
3.  Añade una llave llamada `OPENAI_API_KEY` con tu clave real de OpenAI (sk-...).
4.  Redespliega el proyecto (o haz clic en "Redeploy" en Vercel).

---
**Tu Dominio**: El proyecto ya tiene configurado `metadataBase: new URL('https://www.nexa-ai.dev/')` en `layout.tsx`, listo para cuando conectes tu dominio personalizado en Vercel.
