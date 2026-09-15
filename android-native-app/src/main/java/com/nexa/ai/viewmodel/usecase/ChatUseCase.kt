package com.nexa.ai.viewmodel.usecase
import com.nexa.ai.data.ChatMessage
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import javax.inject.Inject

import com.nexa.ai.data.NexaRepository
import com.nexa.ai.data.StreamEvent
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class ChatUseCaseState(
    val messages: List<ChatMessage> = emptyList(),
    val isLoading: Boolean = false,
    val error: String? = null
)

class ChatUseCase @Inject constructor(private val repository: NexaRepository) {
    private val _state = MutableStateFlow(ChatUseCaseState())
    val state: StateFlow<ChatUseCaseState> = _state.asStateFlow()

    /** Send a message through the chat use case. */
    fun sendMessage(text: String, scope: CoroutineScope) {
        val userMsg = ChatMessage(role = "user", content = text)
        val assistantMsg = ChatMessage(role = "assistant", content = "")
        
        _state.update { 
            it.copy(
                messages = it.messages + userMsg + assistantMsg,
                isLoading = true,
                error = null
            )
        }

        scope.launch {
            try {
                // We use a simulated URL since the user requested "respuesta simulada con image_url" for testing
                // But we still wire up the repository correctly.
                repository.sendMessage(
                    messages = _state.value.messages.dropLast(1),
                    baseUrl = "https://nexa-ai.dev" // using dummy URL for now or should be configurable
                ).collect { event ->
                    when (event) {
                        is StreamEvent.Text -> {
                            updateAssistantMessage { it.copy(content = it.content + event.text) }
                        }
                        is StreamEvent.Image -> {
                            updateAssistantMessage { it.copy(imageUrl = event.url) }
                        }
                        is StreamEvent.Error -> {
                            _state.update { it.copy(error = event.message, isLoading = false) }
                        }
                        is StreamEvent.Done -> {
                            _state.update { it.copy(isLoading = false) }
                            // La respuesta SSE ahora enviará el StreamEvent.Image directamente.
                        }
                        else -> {}
                    }
                }
            } catch (e: Exception) {
                _state.update { it.copy(error = e.message, isLoading = false) }
            }
        }
    }

    private fun updateAssistantMessage(update: (ChatMessage) -> ChatMessage) {
        _state.update { current ->
            val messages = current.messages.toMutableList()
            if (messages.isNotEmpty() && messages.last().role == "assistant") {
                messages[messages.lastIndex] = update(messages.last())
            }
            current.copy(messages = messages)
        }
    }

    /** Clear the chat history. */
    fun clearChat() {
        _state.value = _state.value.copy(messages = emptyList(), error = null)
    }
}
