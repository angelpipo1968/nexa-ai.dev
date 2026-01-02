# 🚀 NEXA OS - Instalación Rápida

## ✅ YA TIENES TODO LISTO

Este ZIP contiene **TODOS** los archivos del proyecto NEXA OS ya organizados.

---

## 📂 PASO 1: Extraer el ZIP

1. Extrae este ZIP en: `C:\Users\pipog\nexa-os-clean`
2. Deberías tener esta estructura:

```
nexa-os-clean/
├── app/
│   ├── api/
│   │   └── chat/
│   │       └── route.ts
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   └── ChatApp.tsx
├── .env.example
├── .gitignore
├── next.config.js
├── package.json
├── postcss.config.js
├── tailwind.config.ts
├── tsconfig.json
└── README.md (este archivo)
```

---

## 🔑 PASO 2: Configurar API Key

1. **Copia** el archivo `.env.example`
2. **Renómbralo** a `.env.local`
3. **Edita** `.env.local` con Notepad
4. **Reemplaza** `tu_api_key_aqui` con tu API key real de Anthropic

```
ANTHROPIC_API_KEY=sk-ant-api03-TU-KEY-REAL-AQUI
```

### ¿No tienes API Key?
1. Ve a: https://console.anthropic.com/
2. Login o crea cuenta
3. API Keys → Create Key
4. Copia la key (empieza con `sk-ant-api03-...`)
5. Pégala en `.env.local`

---

## 📦 PASO 3: Instalar Dependencias

Abre **PowerShell** o **CMD** en la carpeta del proyecto:

```bash
# Ir a la carpeta
cd C:\Users\pipog\nexa-os-clean

# Instalar dependencias
npm install
```

**Espera 1-2 minutos** mientras descarga todo.

---

## 🚀 PASO 4: Iniciar el Proyecto

```bash
npm run dev
```

Deberías ver:
```
▲ Next.js 14.x.x
- Local:        http://localhost:3000

✓ Ready in 2.3s
```

---

## 🌐 PASO 5: Abrir en Navegador

1. Abre tu navegador
2. Ve a: **http://localhost:3000**
3. ¡Deberías ver NEXA OS! 🎉

---

## ✅ Verificación

Si ves esto, ¡todo funciona!:

```
[Logo de NEXA OS con gradiente cyan-purple]
¡Hola! Soy NEXA OS
¿En qué puedo ayudarte hoy?
```

Prueba enviar un mensaje para verificar que la API funciona.

---

## 🐛 Solución de Problemas

### Error: "Cannot find module"
```bash
rm -rf node_modules
npm install
```

### Error: "Invalid API Key"
- Verifica que `.env.local` existe (NO `.env.example`)
- Verifica que la API key es correcta
- Reinicia el servidor: Ctrl+C y luego `npm run dev`

### Error: "Port 3000 in use"
```bash
npm run dev -- -p 3001
# Luego abre: http://localhost:3001
```

---

## 📝 Archivos Importantes

- **`.env.local`** - TU API KEY (NO subir a GitHub)
- **`components/ChatApp.tsx`** - Interfaz del chat
- **`app/api/chat/route.ts`** - API para Claude
- **`app/page.tsx`** - Página principal
- **`package.json`** - Dependencias del proyecto

---

## 🔄 Para Hacer Cambios

Cualquier cambio que hagas se verá automáticamente en el navegador (hot reload).

Para detener el servidor: **Ctrl + C**

---

## 🌐 Desplegar en Vercel (Opcional)

Una vez que funcione localmente, puedes desplegarlo:

1. Sube el proyecto a GitHub
2. Conecta GitHub con Vercel
3. Configura `ANTHROPIC_API_KEY` en Vercel
4. Deploy

Ver **DEPLOYMENT_GUIDE.md** para más detalles.

---

## 🆘 ¿Necesitas Ayuda?

Si algo no funciona:
1. Verifica que seguiste TODOS los pasos
2. Lee los mensajes de error en la terminal
3. Busca en los archivos `.md` de documentación

---

**¡Disfruta de NEXA OS! 🚀**

Hecho con ❤️ para nexa-ai.dev
