package com.nexa.ai.ml
import javax.inject.Inject

class UserProfileManager @Inject constructor() {

    /** Get the stored Groq API key. */
    fun groqApiKey(): String = ""

    /** Set the Groq API key. */
    fun setGroqApiKey(key: String) {}

    /** Delete the stored Groq API key. */
    fun deleteGroqApiKey() {}

    /** Get the maximum tokens setting. */
    fun maxTokens(): Int = 4096

    /** Set the maximum tokens. */
    fun setMaxTokens(tokens: Int) {}

    /** Check whether local LLM mode is enabled. */
    fun useLocalLLM(): Boolean = false

    /** Set whether to use local LLM. */
    fun setUseLocalLLM(use: Boolean) {}
}
