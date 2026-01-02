# Guía de Despliegue: NEXA OS (Sovereign-RAG)

Tu sistema está listo. Para publicarlo en internet y usarlo desde tu móvil, recomendamos Vercel.

## 1. Verificación Previa
El proyecto ya construye correctamente (`npm run build` pasó).
Asegúrate de que tu repositorio incluye la carpeta `docs/` para que la memoria soberana funcione en la nube.

## 2. Desplegar con Vercel CLI
Es la forma más rápida. Abre la terminal en `nexa-os`:

1.  **Instalar CLI:**
    ```powershell
    npm i -g vercel
    ```

2.  **Iniciar Despliegue:**
    ```powershell
    vercel
    ```

3.  **Responder Preguntas:**
    - Set up and deploy? -> `Y`
    - Which scope? -> (Da Enter para seleccionar tu usuario)
    - Link to existing project? -> `N`
    - Project name? -> `nexa-os` (o lo que quieras)
    - Directory? -> `.` (Enter)
    - **Want to modify settings?** -> `N` (Detectará Next.js automáticamente).

## 3. Configurar Variables (CRÍTICO) 🛑
NEXA **fallará** en la nube si no agregas tu llave de Google.

1.  Ve al Dashboard de tu proyecto en [vercel.com](https://vercel.com/dashboard).
2.  Entra a **Settings** > **Environment Variables**.
3.  Agrega una nueva variable:
    - **Key:** `GOOGLE_API_KEY`
    - **Value:** (Tu clave copiada de `.env.local` o Google AI Studio)
4.  Guarda.
5.  **Re-despliega** (Ve a Deployments -> Redeploy) para que la llave surta efecto.

## 4. Uso en Móvil
Una vez desplegado:
- Entra a la URL que te da Vercel (ej: `nexa-os.vercel.app`).
- Añádelo a tu pantalla de inicio ("Add to Home Screen") para usarlo como App nativa a pantalla completa.
