package com.nexa.ai.web
data class SearchResult(val answer: String = "", val confidence: Float = 0f, val sources: List<String> = emptyList())
