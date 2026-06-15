package com.nexa.ai.web
import javax.inject.Inject

class WebResultProcessor @Inject constructor() {

    /** Search and process results with language preference. */
    fun searchAndProcess(query: String, language: String): ProcessedResult = ProcessedResult()

    /** Clear cached results. */
    fun clearCache() {}
}
