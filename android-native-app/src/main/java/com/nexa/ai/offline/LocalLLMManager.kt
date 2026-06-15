package com.nexa.ai.offline
import javax.inject.Inject

class LocalLLMManager @Inject constructor() {

    /** Load a model from assets.
     *  @param modelName The name of the model file in assets (optional).
     *  @return true if the model was loaded successfully.
     */
    fun loadModelFromAssets(modelName: String = "default"): Boolean = false

    /** Shut down the local LLM and release resources. */
    fun shutdown() {}
}
