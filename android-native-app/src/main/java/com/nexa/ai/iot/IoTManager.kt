package com.nexa.ai.iot
import javax.inject.Inject

class IoTManager @Inject constructor() {

    /** Initialize demo/smart devices for the IoT subsystem. */
    fun initDemoDevices() {}

    /** Process a voice command related to IoT devices.
     *  @return A spoken response string.
     */
    fun processVoiceCommand(command: String): String = ""

    /** Handle an IoT voice command (alias). */
    fun onIoTVoiceCommand(command: String) {}

    /** Check whether sync is allowed. */
    fun allowSync(): Boolean = false

    /** Set whether sync is allowed. */
    fun setAllowSync(allow: Boolean) {}

    /** Check if a command is an IoT-related command. */
    fun isIoTCommand(cmd: String): Boolean = false
}
