# 🧠 CONOCIMIENTO EXTRAÍDO DE DOLA AI
**Origen:** https://www.dola.com/chat/38412968663178769
**Fecha de Extracción:** 2026-05-01
**Contexto:** Optimización Nexa AI para Samsung S26 Ultra y nuevas funcionalidades.

---

## 📱 1. OPTIMIZACIÓN DE INTERFAZ (S26 ULTRA)
La conversación detalla cómo lograr una experiencia "Edge-to-Edge" total.

### Ajustes de Layout (activity_main.xml)
- **Subida de 5mm:** Uso de `android:translationY="-5dp"` para elevar la barra de chat.
- **Transparencia:** Configuración del `WebView` para ignorar los límites del sistema (`FLAG_LAYOUT_NO_LIMITS`).

### Lógica Java (MainActivity.java)
- **Opción Nuclear:** Implementación de márgenes físicos programáticos para forzar la visibilidad del chat por encima de la barra de navegación de Android.

---

## 📁 2. GESTIÓN DE ARCHIVOS (NUEVA FUNCIÓN)
Se ha extraído la estructura para que Nexa pueda manipular archivos localmente.

### Clase: GestorArchivos.java
Permite a la aplicación:
1.  Crear carpetas en el almacenamiento interno.
2.  Guardar registros de chat en formato `.txt`.
3.  Descargar imágenes generadas directamente a la galería del usuario.

### Permisos Necesarios
```xml
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.MANAGE_EXTERNAL_STORAGE" />
```

---

## 🎬 3. GENERACIÓN MULTIMEDIA (VIDEO/IMAGEN)
Lógica para que Nexa actúe como un creador de contenido.

- **Conexión con nexa_completo.py:** Nexa debe enviar prompts estructurados al servidor de Python para iniciar la renderización de videos.
- **Flujo de Trabajo:** 
    1. Usuario pide video.
    2. Nexa procesa el guion.
    3. Nexa llama a la API interna de generación.
    4. El resultado se muestra mediante el `VoiceVideoOverlay.tsx`.

---

## 💡 4. MEJORAS DE UX SUGERIDAS
- **Modo Inmortal:** Mantener el servicio en primer plano (`Foreground Service`) para autonomía 24/7.
- **Personalidad Adaptativa:** Sistema de "Memoria a largo plazo" basado en archivos locales para que Nexa aprenda del usuario sin depender 100% de la nube.
- **120Hz Nativo:** Forzar el refresco de pantalla en dispositivos Samsung para máxima suavidad.

---
*Este documento sirve como base de datos técnica para futuras actualizaciones de Nexa AI.*
