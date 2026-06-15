package com.nexa.ai.ml
import javax.inject.Inject

class OnDeviceMLEngine @Inject constructor() {

    /** Shut down the ML engine and release resources. */
    fun shutdown() {}

    /** Set the inference mode (e.g. "online", "on_device", "hybrid"). */
    fun setMode(mode: String) {}

    /** Notify the engine that the user's activity has changed. */
    fun onActivityChanged(activity: String) {}

    /** Notify the engine that the battery is low. */
    fun onBatteryLow() {}
}
