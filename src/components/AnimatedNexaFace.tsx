'use client';

import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

export type NexaFaceState = "LISTENING" | "THINKING" | "SPEAKING" | "WAITING";

interface AnimatedNexaFaceProps {
    state: NexaFaceState;
    color1?: string;
    color2?: string;
    size?: number;
}

export function AnimatedNexaFace({ 
    state, 
    color1 = "#00f2fe", 
    color2 = "#4facfe", 
    size = 280 
}: AnimatedNexaFaceProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const timeRef = useRef<number>(0);
    const reqRef = useRef<number>(0);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Settings
        const eyeRadius = size * 0.05;
        const eyeSpacing = size * 0.25;
        const browWidth = size * 0.12;
        const browCurveHeight = size * 0.04;
        
        // Target values for smooth interpolation
        const targets = {
            leftEyeRadiusY: eyeRadius,
            rightEyeRadiusY: eyeRadius,
            lookOffsetX: 0,
            lookOffsetY: 0,
            mouthWidth: size * 0.15,
            mouthHeight: size * 0.02,
            leftBrowOffset: 0,
            rightBrowOffset: 0,
            leftBrowRotate: 0,
            rightBrowRotate: 0
        };

        const current = { ...targets };

        // Helper to lerp
        const lerp = (start: number, end: number, amt: number) => {
            return (1 - amt) * start + amt * end;
        };

        let nextBlinkTime = performance.now() + Math.random() * 3000 + 2000;
        let isBlinking = false;
        let blinkPhase = 0; // 0 to 1 back to 0

        const draw = (t: number) => {
            timeRef.current = t;
            ctx.clearRect(0, 0, size, size);
            
            const centerX = size / 2;
            const centerY = size / 2;

            // 1. Draw glowing background
            const gradientRotation = t * 0.001;
            ctx.save();
            ctx.translate(centerX, centerY);
            ctx.rotate(gradientRotation);
            
            const bgGradient = ctx.createLinearGradient(-size/2, -size/2, size/2, size/2);
            bgGradient.addColorStop(0, color1);
            bgGradient.addColorStop(1, color2);
            
            ctx.beginPath();
            ctx.arc(0, 0, size * 0.45, 0, Math.PI * 2);
            ctx.fillStyle = bgGradient;
            ctx.fill();
            
            // Add a subtle glassmorphism effect (white overlay)
            ctx.beginPath();
            ctx.arc(0, 0, size * 0.43, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
            ctx.fill();
            ctx.restore();

            // 2. Logic for State
            targets.lookOffsetX = 0;
            targets.lookOffsetY = 0;
            targets.mouthWidth = size * 0.15;
            targets.mouthHeight = size * 0.02;
            targets.leftBrowOffset = 0;
            targets.rightBrowOffset = 0;
            targets.leftBrowRotate = 0;
            targets.rightBrowRotate = 0;

            if (state === "THINKING") {
                targets.lookOffsetX = Math.sin(t * 0.005) * (size * 0.08);
                targets.leftBrowOffset = -size * 0.01;
                targets.rightBrowOffset = size * 0.01;
                targets.leftBrowRotate = -15 * (Math.PI / 180);
                targets.rightBrowRotate = 15 * (Math.PI / 180);
                targets.mouthWidth = size * 0.06;
                targets.mouthHeight = size * 0.06;
            } else if (state === "SPEAKING") {
                // Mouth pulsing
                targets.mouthWidth = size * 0.15 + Math.sin(t * 0.02) * (size * 0.05);
                targets.mouthHeight = size * 0.05 + Math.abs(Math.sin(t * 0.02)) * (size * 0.08);
            } else if (state === "LISTENING") {
                targets.mouthWidth = size * 0.1;
                targets.mouthHeight = size * 0.03;
                targets.leftBrowOffset = -size * 0.03;
                targets.rightBrowOffset = -size * 0.03;
                targets.leftBrowRotate = 8 * (Math.PI / 180);
                targets.rightBrowRotate = -8 * (Math.PI / 180);
            }

            // Blinking logic
            if (!isBlinking && t > nextBlinkTime) {
                isBlinking = true;
            }
            
            if (isBlinking) {
                blinkPhase += 0.1;
                if (blinkPhase >= Math.PI) {
                    blinkPhase = 0;
                    isBlinking = false;
                    nextBlinkTime = t + Math.random() * 3000 + 1000;
                }
            }
            
            const blinkMultiplier = isBlinking ? 1 - Math.sin(blinkPhase) : 1;
            targets.leftEyeRadiusY = eyeRadius * blinkMultiplier;
            targets.rightEyeRadiusY = eyeRadius * blinkMultiplier;

            // Interpolate
            const speed = 0.15;
            current.leftEyeRadiusY = lerp(current.leftEyeRadiusY, targets.leftEyeRadiusY, speed);
            current.rightEyeRadiusY = lerp(current.rightEyeRadiusY, targets.rightEyeRadiusY, speed);
            current.lookOffsetX = lerp(current.lookOffsetX, targets.lookOffsetX, speed);
            current.lookOffsetY = lerp(current.lookOffsetY, targets.lookOffsetY, speed);
            current.mouthWidth = lerp(current.mouthWidth, targets.mouthWidth, speed);
            current.mouthHeight = lerp(current.mouthHeight, targets.mouthHeight, speed);
            current.leftBrowOffset = lerp(current.leftBrowOffset, targets.leftBrowOffset, speed);
            current.rightBrowOffset = lerp(current.rightBrowOffset, targets.rightBrowOffset, speed);
            current.leftBrowRotate = lerp(current.leftBrowRotate, targets.leftBrowRotate, speed);
            current.rightBrowRotate = lerp(current.rightBrowRotate, targets.rightBrowRotate, speed);

            const faceColor = "#FFFFFF";

            // Draw Eyes
            const eyeY = centerY - size * 0.05;
            
            ctx.fillStyle = faceColor;
            
            // Left Eye
            ctx.beginPath();
            ctx.ellipse(centerX - eyeSpacing + current.lookOffsetX, eyeY + current.lookOffsetY, eyeRadius, current.leftEyeRadiusY, 0, 0, Math.PI * 2);
            ctx.fill();

            // Right Eye
            ctx.beginPath();
            ctx.ellipse(centerX + eyeSpacing + current.lookOffsetX, eyeY + current.lookOffsetY, eyeRadius, current.rightEyeRadiusY, 0, 0, Math.PI * 2);
            ctx.fill();

            // Draw Eyebrows (Curved)
            const browY = eyeY - size * 0.12;
            
            ctx.lineWidth = Math.max(2, size * 0.02);
            ctx.strokeStyle = faceColor;
            ctx.lineCap = "round";

            // Helper to draw curved brow
            const drawBrow = (x: number, y: number, rot: number) => {
                ctx.save();
                ctx.translate(x, y);
                ctx.rotate(rot);
                ctx.beginPath();
                ctx.moveTo(-browWidth / 2, 0);
                ctx.quadraticCurveTo(0, -browCurveHeight, browWidth / 2, 0);
                ctx.stroke();
                ctx.restore();
            };

            // Left brow
            drawBrow(centerX - eyeSpacing + current.lookOffsetX, browY + current.leftBrowOffset, current.leftBrowRotate);
            // Right brow
            drawBrow(centerX + eyeSpacing + current.lookOffsetX, browY + current.rightBrowOffset, current.rightBrowRotate);

            // Draw Mouth
            const mouthY = centerY + size * 0.18;
            ctx.beginPath();
            if (state === "THINKING" || state === "SPEAKING") {
                // Oval mouth
                ctx.ellipse(centerX, mouthY, current.mouthWidth / 2, current.mouthHeight / 2, 0, 0, Math.PI * 2);
                ctx.fill();
            } else {
                // Smiling/neutral curve
                ctx.moveTo(centerX - current.mouthWidth / 2, mouthY);
                ctx.quadraticCurveTo(centerX, mouthY + current.mouthHeight, centerX + current.mouthWidth / 2, mouthY);
                ctx.stroke();
            }

            reqRef.current = requestAnimationFrame(draw);
        };

        reqRef.current = requestAnimationFrame(draw);

        return () => {
            cancelAnimationFrame(reqRef.current);
        };
    }, [state, color1, color2, size]);

    return (
        <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            style={{ width: size, height: size }}
        >
            <canvas ref={canvasRef} width={size} height={size} style={{ display: 'block', width: '100%', height: '100%' }} />
        </motion.div>
    );
}
