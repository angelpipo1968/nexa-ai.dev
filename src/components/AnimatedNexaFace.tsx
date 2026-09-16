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
        const eyeRadiusX = size * 0.055;
        const eyeRadiusY = size * 0.075;
        const eyeSpacing = size * 0.22;
        const browWidth = size * 0.14;
        const browCurveHeight = size * 0.03;
        
        // Match the 3D colors based on state exactly like Android
        let c1 = color1;
        let c2 = color2;
        if (state === "SPEAKING") {
            c1 = "#E2F059";
            c2 = "#439031";
        } else if (state === "LISTENING") {
            c1 = "#4AC29A";
            c2 = "#104A8E";
        } else if (state === "THINKING") {
            c1 = "#F3A183";
            c2 = "#8A2387";
        } else {
            c1 = "#FDEB71";
            c2 = "#F8D800";
        }

        // Target values for smooth interpolation
        const targets = {
            leftEyeRadiusY: eyeRadiusY,
            rightEyeRadiusY: eyeRadiusY,
            lookOffsetX: 0,
            lookOffsetY: 0,
            mouthWidth: size * 0.15,
            mouthHeight: size * 0.02,
            leftBrowOffset: 0,
            rightBrowOffset: 0,
            leftBrowRotate: 0,
            rightBrowRotate: 0,
            mouthScale: 0.5
        };

        const current = { ...targets };

        // Helper to lerp
        const lerp = (start: number, end: number, amt: number) => {
            return (1 - amt) * start + amt * end;
        };

        let nextBlinkTime = performance.now() + Math.random() * 3000 + 2000;
        let isBlinking = false;
        let blinkPhase = 0;

        const draw = (t: number) => {
            timeRef.current = t;
            ctx.clearRect(0, 0, size, size);
            
            const centerX = size / 2;
            const centerY = size / 2;

            // 1. Draw glowing background
            ctx.save();
            ctx.translate(centerX, centerY);
            
            // Outer glow
            const glowGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 0.65);
            glowGradient.addColorStop(0, c1 + "66"); // 40% alpha
            glowGradient.addColorStop(1, "transparent");
            ctx.beginPath();
            ctx.arc(0, 0, size * 0.65, 0, Math.PI * 2);
            ctx.fillStyle = glowGradient;
            ctx.fill();

            // 3D Sphere Base (Radial Gradient with offset highlight)
            const bgGradient = ctx.createRadialGradient(-size*0.15, -size*0.15, size*0.05, 0, 0, size * 0.5);
            bgGradient.addColorStop(0, c1);
            bgGradient.addColorStop(1, c2);
            
            ctx.beginPath();
            ctx.arc(0, 0, size * 0.45, 0, Math.PI * 2);
            ctx.fillStyle = bgGradient;
            ctx.fill();
            ctx.restore();

            // 2. Logic for State
            targets.lookOffsetX = 0;
            targets.lookOffsetY = 0;
            targets.leftBrowOffset = 0;
            targets.rightBrowOffset = 0;
            targets.leftBrowRotate = 0;
            targets.rightBrowRotate = 0;
            
            // Speaking animation (mouth scale)
            const speakingPulse = Math.sin(t * 0.015) * 0.5 + 0.5; // 0 to 1
            targets.mouthScale = state === "SPEAKING" ? 0.5 + speakingPulse : 1.0;

            if (state === "THINKING") {
                targets.lookOffsetX = Math.sin(t * 0.005) * (size * 0.05);
                targets.lookOffsetY = -size * 0.05;
                targets.leftBrowOffset = -size * 0.01;
                targets.rightBrowOffset = size * 0.01;
                targets.leftBrowRotate = -15 * (Math.PI / 180);
                targets.rightBrowRotate = 15 * (Math.PI / 180);
            } else if (state === "LISTENING") {
                targets.leftBrowOffset = -size * 0.02;
                targets.rightBrowOffset = -size * 0.02;
                targets.leftBrowRotate = 8 * (Math.PI / 180);
                targets.rightBrowRotate = -8 * (Math.PI / 180);
            }

            // Blinking logic
            if (!isBlinking && t > nextBlinkTime) {
                isBlinking = true;
            }
            if (isBlinking) {
                blinkPhase += 0.15;
                if (blinkPhase >= Math.PI) {
                    blinkPhase = 0;
                    isBlinking = false;
                    nextBlinkTime = t + Math.random() * 3000 + 2000;
                }
            }
            
            const blinkMultiplier = Math.max(0.05, isBlinking ? 1 - Math.sin(blinkPhase) : 1);
            targets.leftEyeRadiusY = eyeRadiusY * blinkMultiplier;
            targets.rightEyeRadiusY = eyeRadiusY * blinkMultiplier;

            // Interpolate
            const speed = 0.2;
            current.leftEyeRadiusY = lerp(current.leftEyeRadiusY, targets.leftEyeRadiusY, speed);
            current.rightEyeRadiusY = lerp(current.rightEyeRadiusY, targets.rightEyeRadiusY, speed);
            current.lookOffsetX = lerp(current.lookOffsetX, targets.lookOffsetX, speed);
            current.lookOffsetY = lerp(current.lookOffsetY, targets.lookOffsetY, speed);
            current.leftBrowOffset = lerp(current.leftBrowOffset, targets.leftBrowOffset, speed);
            current.rightBrowOffset = lerp(current.rightBrowOffset, targets.rightBrowOffset, speed);
            current.leftBrowRotate = lerp(current.leftBrowRotate, targets.leftBrowRotate, speed);
            current.rightBrowRotate = lerp(current.rightBrowRotate, targets.rightBrowRotate, speed);
            current.mouthScale = lerp(current.mouthScale, targets.mouthScale, speed);

            const eyeY = centerY - size * 0.04 + current.lookOffsetY;

            const draw3DEye = (cx: number, cy: number) => {
                // Sclera
                ctx.beginPath();
                ctx.ellipse(cx, cy, eyeRadiusX, current.leftEyeRadiusY, 0, 0, Math.PI * 2);
                ctx.fillStyle = "#FFFFFF";
                ctx.fill();
                
                // Iris
                const irisRX = eyeRadiusX * 0.7;
                const irisRY = current.leftEyeRadiusY * 0.7;
                ctx.beginPath();
                ctx.ellipse(cx, cy, irisRX, irisRY, 0, 0, Math.PI * 2);
                ctx.fillStyle = "#0077CC";
                ctx.fill();
                
                // Pupil
                ctx.beginPath();
                ctx.ellipse(cx, cy, irisRX * 0.6, irisRY * 0.6, 0, 0, Math.PI * 2);
                ctx.fillStyle = "#001A33";
                ctx.fill();
                
                // Catchlights
                if (blinkMultiplier > 0.5) {
                    ctx.beginPath();
                    ctx.ellipse(cx - irisRX * 0.4, cy - irisRY * 0.6, irisRX * 0.5, irisRY * 0.5, 0, 0, Math.PI * 2);
                    ctx.fillStyle = "#FFFFFF";
                    ctx.fill();
                    
                    ctx.beginPath();
                    ctx.ellipse(cx + irisRX * 0.2, cy + irisRY * 0.2, irisRX * 0.25, irisRY * 0.25, 0, 0, Math.PI * 2);
                    ctx.fillStyle = "rgba(255,255,255,0.8)";
                    ctx.fill();
                }
            };

            const leftEyeX = centerX - eyeSpacing + current.lookOffsetX;
            const rightEyeX = centerX + eyeSpacing + current.lookOffsetX;
            draw3DEye(leftEyeX, eyeY);
            draw3DEye(rightEyeX, eyeY);

            // Draw 3D Eyebrows
            const browY = eyeY - size * 0.1;
            
            const draw3DBrow = (x: number, y: number, rot: number) => {
                ctx.save();
                ctx.translate(x, y);
                ctx.rotate(rot);
                
                // Shadow
                ctx.beginPath();
                ctx.moveTo(-browWidth / 2, 0);
                ctx.quadraticCurveTo(0, -browCurveHeight, browWidth / 2, 0);
                ctx.lineWidth = size * 0.025;
                ctx.strokeStyle = "rgba(0,0,0,0.15)";
                ctx.lineCap = "round";
                ctx.stroke();
                
                // Main color
                ctx.translate(0, -size * 0.006);
                ctx.beginPath();
                ctx.moveTo(-browWidth / 2, 0);
                ctx.quadraticCurveTo(0, -browCurveHeight, browWidth / 2, 0);
                ctx.lineWidth = size * 0.02;
                ctx.strokeStyle = "#F4F6D3";
                ctx.lineCap = "round";
                ctx.stroke();
                
                ctx.restore();
            };

            draw3DBrow(leftEyeX, browY + current.leftBrowOffset, current.leftBrowRotate);
            draw3DBrow(rightEyeX, browY + current.rightBrowOffset, current.rightBrowRotate);

            // Draw 3D Mouth
            ctx.beginPath();
            if (state === "SPEAKING") {
                const mw = size * 0.12 + (size * 0.06 * current.mouthScale * 0.3);
                const mh = size * 0.04 + (size * 0.08 * current.mouthScale);
                const my = centerY + size * 0.08;
                
                ctx.moveTo(centerX - mw/2, my);
                ctx.quadraticCurveTo(centerX, my + mh, centerX + mw/2, my);
                ctx.quadraticCurveTo(centerX, my - mh*0.2, centerX - mw/2, my);
                ctx.fillStyle = "#4A0008";
                ctx.fill();
                
                // Tongue
                ctx.beginPath();
                ctx.ellipse(centerX - mw * 0.15, my + mh * 0.3, mw * 0.35, mh * 0.3, 0, 0, Math.PI * 2);
                ctx.fillStyle = "#FF5252";
                ctx.fill();
            } else if (state === "LISTENING") {
                const mw = size * 0.16;
                const mh = size * 0.08;
                const my = centerY + size * 0.08;
                
                ctx.moveTo(centerX - mw/2, my);
                ctx.quadraticCurveTo(centerX, my + mh * 1.5, centerX + mw/2, my);
                ctx.quadraticCurveTo(centerX, my + mh * 0.2, centerX - mw/2, my);
                ctx.fillStyle = "#3B0B14";
                ctx.fill();
                
                // Tongue
                ctx.beginPath();
                ctx.ellipse(centerX - mw * 0.1, my + mh * 0.4, mw * 0.3, mh * 0.25, 0, 0, Math.PI * 2);
                ctx.fillStyle = "#FA7882";
                ctx.fill();
            } else if (state === "THINKING") {
                ctx.ellipse(centerX - size * 0.02, centerY + size * 0.09, size * 0.02, size * 0.02, 0, 0, Math.PI * 2);
                ctx.fillStyle = "#2E0911";
                ctx.fill();
            } else {
                const my = centerY + size * 0.1;
                ctx.moveTo(centerX - size * 0.04, my);
                ctx.quadraticCurveTo(centerX, my + size * 0.03, centerX + size * 0.04, my);
                ctx.lineWidth = size * 0.015;
                ctx.strokeStyle = "#3B0B14";
                ctx.lineCap = "round";
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
