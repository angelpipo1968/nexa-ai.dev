package com.nexa.ai.ml
import javax.inject.Inject

class EnhancedEmotionAnalyzer @Inject constructor() {

    /** Notify the analyzer that the user context has changed. */
    fun onContextChanged(context: String) {}

    /** Notify the analyzer that a language was detected. */
    fun onLanguageDetected(lang: String) {}
}
