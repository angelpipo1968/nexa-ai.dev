# Guía para Generar tu App Android (APK/AAB)

¡Tu proyecto NEXA OS ya está listo para convertirse en una App de Android!
Sigue estos pasos finales para generar el archivo instalable.

## Requisitos Previos
- Tener instalado **Android Studio** (Gratis).

## Pasos para Generar el APK

1. **Abrir el Proyecto en Android Studio**
   Ejecuta el siguiente comando en tu terminal:
   ```bash
   npx cap open android
   ```
   *Esto abrirá Android Studio automáticamente con tu proyecto cargado.*

2. **Esperar la Sincronización**
   Al abrir, Android Studio comenzará a descargar dependencias (Gradle). Espera a que termine la barra de progreso inferior.

3. **Generar el Archivo Firmado (Para Google Play)**
   - En el menú superior, ve a: **Build** > **Generate Signed Bundle / APK**.
   - Selecciona **Android App Bundle** (Recomendado para Play Store) o **APK** (Para probar en tu teléfono).
   - Haz clic en **Next**.
   - En "Key store path", elige **Create new...** (si no tienes una llave).
     - Guarda el archivo `.jks` en un lugar seguro (¡No lo pierdas!).
     - Crea una contraseña y recuérdala.
   - Completa los campos y da clic en **Next**.
   - Selecciona **release** y marca las casillas V1 y V2 (si es APK).
   - Haz clic en **Create** o **Finish**.

4. **¡Listo!**
   Android Studio te notificará cuando termine. Haz clic en **locate** en la notificación para encontrar tu archivo `.aab` o `.apk`.

## Probar en tu Teléfono (Modo Desarrollador)
1. Conecta tu celular por USB.
2. En Android Studio, selecciona tu dispositivo en el menú superior (donde dice "No Devices" o "Pixel...").
3. Haz clic en el botón **Play (Triángulo Verde)**.
4. ¡La app se instalará y abrirá en tu celular!

## Subir a Google Play Console
1. Ve a [Google Play Console](https://play.google.com/console).
2. Crea una cuenta de desarrollador ($25 USD pago único).
3. Crea una "Nueva Aplicación".
4. Sube el archivo `.aab` que generaste en el paso 3.
5. Completa la ficha de la tienda (Nombre, Descripción, Imágenes).
6. Envía a revisión.

---
**Nota:** Si haces cambios en el código de NEXA OS, recuerda siempre ejecutar estos dos comandos antes de volver a Android Studio:
```bash
npm run build
npx cap sync
```
