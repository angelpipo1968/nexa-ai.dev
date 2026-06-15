package com.nexa.ai.voice
import javax.inject.Inject

class VoiceEnhancer @Inject constructor() {

    /** Callback invoked when a wake word is detected. */
    var onWakeWordDetected: (() -> Unit)? = null

    /** Callback invoked when an IoT-related voice command is detected. */
    var onIoTVoiceCommand: ((String) -> Unit)? = null

    /** Callback invoked when a language is detected (language code, confidence). */
    var onLanguageDetected: ((String, Float) -> Unit)? = null

    /** Start listening for voice input. */
    fun startListening() {}

    /** Stop listening for voice input. */
    fun stopListening() {}

    /** Stop wake word detection (e.g. on battery low). */
    fun stopWakeWordDetection() {}

    /** Release resources. */
    fun shutdown() {}
}
