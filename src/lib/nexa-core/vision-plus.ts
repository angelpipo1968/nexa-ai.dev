import jsQR from 'jsqr';
import { createCanvas, loadImage } from 'canvas';

/**
 * NEXA VISION PLUS
 * Procesamiento avanzado de imágenes: QR, OCR e Intenciones Visuales.
 */

export async function processAdvancedVision(base64Image: string): Promise<string> {
    try {
        const imgBuffer = Buffer.from(base64Image, 'base64');
        const image = await loadImage(imgBuffer);
        
        const canvas = createCanvas(image.width, image.height);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(image, 0, 0);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        // 1. INTENTO DE ESCANEO QR
        const qrCode = jsQR(imageData.data, imageData.width, imageData.height);
        
        let result = "";
        if (qrCode) {
            result += `[QR DETECTADO]: ${qrCode.data}\n`;
            if (qrCode.data.startsWith('http')) {
                result += `🔗 ENLACE ENCONTRADO: Puedes acceder aquí: ${qrCode.data}\n`;
            }
        }

        return result || "No se detectaron códigos QR, pero la imagen está lista para análisis de contenido.";
    } catch (e) {
        console.error("Error en Vision Plus:", e);
        return "Error al procesar el escaneo avanzado de la imagen.";
    }
}
