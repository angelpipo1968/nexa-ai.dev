/**
 * NEXA CORE — Servicio de Generación de Imágenes (OpenAI DALL-E 3)
 */

export async function generateImage(prompt: string): Promise<string> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return "Error: No hay API Key de OpenAI configurada.";

    try {
        const response = await fetch('https://api.openai.com/v1/images/generations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "dall-e-3",
                prompt: prompt,
                n: 1,
                size: "1024x1024"
            })
        });

        const data = await response.json();
        if (data.error) return `Error de DALL-E: ${data.error.message}`;

        const imageUrl = data.data[0].url;
        return `IMAGEN GENERADA EXITOSAMENTE:\nAquí tienes el enlace a la imagen que diseñé para ti: ${imageUrl}\n\n(Puedes verla abriendo el enlace o yo puedo describirla por ti).`;
    } catch (error: any) {
        return `Error al generar imagen: ${error.message}`;
    }
}
