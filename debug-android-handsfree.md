[OPEN] Debug Session: android-handsfree

# Bug
- Sintoma: el modo manos libres no funciona en la app Android instalada en el telefono.
- Contexto: ya se ajustaron URL del chat, permisos y arranque del servicio, pero el usuario confirma que sigue sin funcionar.

# Objetivo
- Capturar evidencia runtime del flujo completo de manos libres en el telefono.
- Identificar en que paso exacto falla: permiso, arranque de servicio, SpeechRecognizer, broadcast, envio del texto o TTS.

# Hipotesis Iniciales
1. El servicio `NexaSpeechService` arranca pero `SpeechManager.startListening()` falla en runtime y solo emite error interno.
2. El servicio emite broadcasts, pero `NexaViewModel` no recibe o no procesa correctamente `ACTION_SPEECH_RESULT` / `ACTION_SPEECH_ERROR`.
3. El permiso de microfono esta concedido, pero el flujo de `voiceMode` no deja el estado en escucha real.
4. El reconocimiento obtiene texto, pero el resultado no llega a `sendMessage()` por enfriamiento, debounce o estado UI.
5. El problema real no es STT sino audio routing / TTS, y el usuario interpreta "no funciona" como ausencia de respuesta audible.

# Plan
1. Instrumentar puntos de entrada/salida del flujo de manos libres.
2. Reinstalar APK debug instrumentada.
3. Reproducir en telefono y capturar logs.
4. Confirmar o descartar hipotesis con evidencia.
5. Aplicar fix minimo y verificar.

# Evidencia
- Aun no se reciben eventos. Causa probable: la app no podia enviar HTTP cleartext o el telefono no podia llegar al IP local.
- Se preparo configuracion debug para permitir cleartext y se cambiaron los endpoints de instrumentation a `http://127.0.0.1:7777/event` para usar `adb reverse tcp:7777 tcp:7777`.

# Estado
- Sesion abierta.
