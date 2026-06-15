package com.nexa.ai.voice
import javax.inject.Inject

class NexaSpeechService @Inject constructor() {

    companion object {
        const val ACTION_SPEECH_STATE = "com.nexa.ai.SPEECH_STATE"
        const val ACTION_SPEECH_RESULT = "com.nexa.ai.SPEECH_RESULT"
        const val ACTION_SPEECH_PARTIAL = "com.nexa.ai.SPEECH_PARTIAL"
        const val ACTION_SPEECH_ERROR = "com.nexa.ai.SPEECH_ERROR"
        const val EXTRA_STATE = "state"
        const val EXTRA_TEXT = "text"
        const val EXTRA_ERROR_KEY = "error"
    }
}
