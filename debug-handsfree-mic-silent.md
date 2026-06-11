[OPEN] handsfree-mic-silent

## Síntomas (usuario)
- Manos libres / micrófono del chat: “escucha / habla pero en silencio”, no transcribe o parece desconectado.

## Hipótesis (falsables)
1) El audio está siendo enrutado a Bluetooth SCO por un estado “conectado” erróneo, dejando el micrófono real sin capturar (SpeechRecognizer recibe audio vacío → NO_MATCH).
2) La app pierde audio focus al entrar en reconocimiento (hasAudioFocus=false en onReadyForSpeech), provocando captura silenciosa o mala ruta de audio.
3) El SpeechRecognizer sí inicia pero no recibe niveles RMS (rms≈0) por configuración de AudioManager / device routing.
4) Permisos OK pero el servicio y la UI están usando instancias distintas (ya mitigado con Hilt); aún así el flujo podría quedarse “listening” sin resultados por estado.

## Evidencia recogida (pre-fix)
- Debug Server: sessionId=android-handsfree runId=handsfree-debug
- Se observó `SpeechManager:startListening` con `isBtSco=true` y luego `SpeechManager:onReadyForSpeech` con `hasAudioFocus=false`.
- Posteriormente `SpeechManager:onError` con `error=7` (NO_MATCH) y reintentos.

## Próximo experimento
- Forzar política: si no hay un SCO activo real, deshabilitar ruta BT y usar micrófono normal + reacquire audio focus antes de startListening.

