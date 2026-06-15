package com.nexa.ai.media
import javax.inject.Inject

class VideoGenerator @Inject constructor() {

    enum class VideoStyles { ANIME, CINEMATIC, REALISTIC, ABSTRACT, VINTAGE, SCI_FI, NATURE }

    /** Route a vision request with image data and a prompt.
     *  @return A response string describing the image.
     */
    fun routeVision(imageData: ByteArray, prompt: String): String = ""
}
