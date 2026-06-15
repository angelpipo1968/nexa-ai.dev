package com.nexa.ai.viewmodel.usecase
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import javax.inject.Inject

data class VoiceUseCaseState(
    val isListening: Boolean = false,
    val isSpeaking: Boolean = false,
    val recognizedText: String = ""
)

class VoiceUseCase @Inject constructor() {
    private val _state = MutableStateFlow(VoiceUseCaseState())
    val state: StateFlow<VoiceUseCaseState> = _state.asStateFlow()
}
