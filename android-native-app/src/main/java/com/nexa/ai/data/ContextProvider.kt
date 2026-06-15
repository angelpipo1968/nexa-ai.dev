package com.nexa.ai.data
import javax.inject.Inject

class ContextProvider @Inject constructor() {

    /** Get a context string suitable for AI enrichment. */
    fun getContextForAI(): String = ""
}
