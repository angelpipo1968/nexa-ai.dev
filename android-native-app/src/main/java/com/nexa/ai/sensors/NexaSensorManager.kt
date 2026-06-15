package com.nexa.ai.sensors
import javax.inject.Inject

class NexaSensorManager @Inject constructor() {

    /** Callback when the sensor context changes (oldContext, newContext). */
    var onContextChanged: ((String, String) -> Unit)? = null

    /** Callback when the user's activity is detected. */
    var onActivityChanged: ((String) -> Unit)? = null

    /** Callback when the battery is low. */
    var onBatteryLow: (() -> Unit)? = null

    /** Start listening to sensors. */
    fun startListening() {}

    /** Stop listening to sensors. */
    fun stopListening() {}

    /** Stop wake word detection. */
    fun stopWakeWordDetection() {}

    /** Register a callback for wake word detection. */
    fun onWakeWordDetected(callback: () -> Unit) {}

    /** Get a compact context string for AI enrichment. */
    fun getContextForAI(): String = ""
}
