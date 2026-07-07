import React from 'react';
import { Canvas } from '@react-three/fiber';
import { Sparkles } from '@react-three/drei';

export default function DashboardBackground() {
  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: -1, pointerEvents: 'none', opacity: 0.7 }}>
      <Canvas camera={{ position: [0, 0, 10], fov: 45 }}>
        {/* We use two sets of sparkles for parallax depth */}
        <Sparkles count={150} scale={20} size={2} speed={0.1} opacity={0.4} color="#9d4edd" />
        <Sparkles count={100} scale={30} size={4} speed={0.3} opacity={0.6} color="#5e6ad2" />
      </Canvas>
    </div>
  );
}
