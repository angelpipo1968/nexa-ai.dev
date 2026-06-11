[OPEN] Debug session: handsfree-audio-io

# Problema
- Sintoma actual: el modo manos libres a veces no habla y a veces no escucha.
- Esperado: al activar manos libres, la app debe escuchar al usuario, procesar la respuesta y hablar en voz alta de forma estable.

# Hipotesis iniciales
- H1: el reconocimiento de voz no se inicia o se reinicia en mal momento y por eso parece que "no escucha".
- H2: el flujo si obtiene texto, pero la respuesta del chat falla por conexion/API y nunca llega una respuesta hablable.
- H3: el motor TTS se dispara, pero el audio sale por un canal/ruta/uso incorrecto y por eso parece que "no habla".
- H4: el estado de `voiceMode`, `isThinking`, `isListening` o `isSpeaking` entra en conflicto y bloquea botones o reinicios del ciclo.
- H5: algun callback del servicio o del ViewModel corta la voz o la escucha demasiado pronto.

# Evidencia
- Se inspeccionaron los puntos principales de voz en [SpeechManager.kt](file:///home/angel/Desktop/nexa-ai.dev/nexa-ai-android/android-native-app/src/main/java/com/nexa/ai/voice/SpeechManager.kt), [NexaViewModel.kt](file:///home/angel/Desktop/nexa-ai.dev/nexa-ai-android/android-native-app/src/main/java/com/nexa/ai/viewmodel/NexaViewModel.kt), [NexaSpeechService.kt](file:///home/angel/Desktop/nexa-ai.dev/nexa-ai-android/android-native-app/src/main/java/com/nexa/ai/voice/NexaSpeechService.kt) y [NexaRepository.kt](file:///home/angel/Desktop/nexa-ai.dev/nexa-ai-android/android-native-app/src/main/java/com/nexa/ai/data/NexaRepository.kt).
- `SpeechManager` ya tenia trazas de reconocimiento (`onReadyForSpeech`, `onError`, `onResults`, `onPartialResults`).
- Se agrego instrumentacion nueva para TTS (`initTTS`, `onStart`, `onDone`, `onError`, `speak`) y para el salto ViewModel/API (`handleSpeechResult`, `sendMessage`, `chatState`, `NexaRepository` SSE).
- Se compilo una APK debug instrumentada en `android-native-app/build/outputs/apk/debug/android-native-app-debug.apk`.
- El paso de verificacion quedo bloqueado porque `adb install` devolvio `no devices/emulators found`.

# Cambios de instrumentacion
- `TraeDebug.kt`: sesion apuntada a `handsfree-audio-io` con `runId=pre-fix`.
- `SpeechManager.kt`: trazas para escuchar, hablar y ciclo TTS.
- `NexaViewModel.kt`: trazas para resultado de voz, envio a chat, autospeak y toggle de voice mode.
- `NexaRepository.kt`: trazas para apertura SSE, chunks de texto y fallos de backend/conexion.

# Estado
- Session abierta.
- Pendiente: reinstalar la build instrumentada y reproducir el fallo con el telefono conectado.
