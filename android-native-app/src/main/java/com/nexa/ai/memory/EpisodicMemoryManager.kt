package com.nexa.ai.memory
import javax.inject.Inject

class EpisodicMemoryManager @Inject constructor() {

    /** Build a memory context string for the given query. */
    fun buildMemoryContext(query: String): String = ""

    /** Clear all stored memories. */
    fun clearAllMemories() {}

    /** Get memory statistics. */
    fun getStats(): MemoryStats = MemoryStats()

    /** Check if the user has granted consent for memory storage. */
    fun hasConsent(): Boolean = false

    /** Set the user's consent for memory storage. */
    fun setConsent(consent: Boolean) {}
}
