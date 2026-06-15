package com.nexa.ai.viewmodel.usecase
import com.nexa.ai.data.ChatMessage
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import javax.inject.Inject

data class ChatUseCaseState(
    val messages: List<ChatMessage> = emptyList(),
    val isLoading: Boolean = false,
    val error: String? = null
)

class ChatUseCase @Inject constructor() {
    private val _state = MutableStateFlow(ChatUseCaseState())
    val state: StateFlow<ChatUseCaseState> = _state.asStateFlow()

    /** Send a message through the chat use case. */
    fun sendMessage(text: String, scope: CoroutineScope) {
        // Stub — actual implementation delegates to NexaRepository
    }

    /** Clear the chat history. */
    fun clearChat() {
        _state.value = _state.value.copy(messages = emptyList(), error = null)
    }
}
