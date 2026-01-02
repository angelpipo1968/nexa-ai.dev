'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { Stars, Float } from '@react-three/drei';
import { useRef } from 'react';
import * as THREE from 'three';

function RotatingStars() {
    const ref = useRef<THREE.Group>(null);

    useFrame((state, delta) => {
        if (ref.current) {
            ref.current.rotation.x -= delta / 10;
            ref.current.rotation.y -= delta / 15;
        }
    });

    return (
        <group ref={ref}>
            <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        </group>
    );
}

export default function Background3D() {
    return (
        <div className="fixed inset-0 -z-10 bg-nexa-bg">
            <Canvas camera={{ position: [0, 0, 1] }}>
                <fog attach="fog" args={['#030305', 0, 15]} />
                <RotatingStars />
            </Canvas>
        </div>
    );
}
