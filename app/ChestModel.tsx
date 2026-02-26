"use client";

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

function Chest({ isLocked }: { isLocked: boolean }) {
  // Reference to the lid group so we can rotate it
  const lidRef = useRef<THREE.Group>(null);

  // useFrame runs on every animation frame (typically 60fps)
  useFrame((state, delta) => {
    if (lidRef.current) {
      // Target angle: locked = 0 radians, unlocked = leaning back ~70 degrees
      const targetRotation = isLocked ? 0 : -Math.PI / 2.5;

      // Smoothly animate the lid's X rotation towards the target
      lidRef.current.rotation.x = THREE.MathUtils.lerp(
        lidRef.current.rotation.x,
        targetRotation,
        delta * 6, // Animation speed
      );
    }
  });

  return (
    <group position={[0, -0.5, 0]}>
      {/* --- CHEST BASE --- */}
      <mesh position={[0, 0.5, 0]}>
        {/* Width, Height, Depth */}
        <boxGeometry args={[2.2, 1, 1.5]} />
        <meshStandardMaterial color="#5c3a21" /> {/* Dark Wood */}
      </mesh>

      {/* Bottom half of the silver lock latch */}
      <mesh position={[0, 0.6, 0.76]}>
        <boxGeometry args={[0.4, 0.4, 0.1]} />
        <meshStandardMaterial color="#9ca3af" /> {/* Silver/Gray */}
      </mesh>

      {/* --- CHEST LID (Hinged) --- */}
      {/* We position the group at the back-top edge so it hinges like a real chest */}
      <group position={[0, 1, -0.75]} ref={lidRef}>
        {/* We offset the mesh forward so the rotation point remains at the back */}
        <mesh position={[0, 0.25, 0.75]}>
          <boxGeometry args={[2.2, 0.5, 1.5]} />
          <meshStandardMaterial color="#8b5a2b" /> {/* Slightly lighter wood */}
        </mesh>

        {/* Top half of the silver lock latch */}
        <mesh position={[0, 0.1, 1.51]}>
          <boxGeometry args={[0.3, 0.6, 0.1]} />
          <meshStandardMaterial color="#e5e7eb" /> {/* Bright Silver */}
        </mesh>
      </group>
    </group>
  );
}

export default function ChestScene({ isLocked }: { isLocked: boolean }) {
  return (
    // 1. Removed mix-blend-screen and bumped opacity up to 80% (or remove opacity-80 entirely for max brightness)
    <div className="absolute inset-0 pointer-events-none z-0 opacity-80">
      <Canvas camera={{ position: [4, 3, 5], fov: 45 }}>
        <ambientLight intensity={1.5} />
        <directionalLight position={[5, 10, 5]} intensity={2.5} />
        <pointLight position={[0, 2, 5]} intensity={2.5} distance={20} />
        <directionalLight position={[-5, 5, -5]} intensity={1.5} />
        <Chest isLocked={isLocked} />
      </Canvas>
    </div>
  );
}
