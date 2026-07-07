import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function FloatingSpheres({ count = 200, color = "#9d4edd", scale = 1, speed = 0.5 }) {
  const mesh = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);
  
  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * 30;
      const y = (Math.random() - 0.5) * 30;
      const z = (Math.random() - 0.5) * 20;
      const factor = Math.random() * 0.5 + 0.5;
      temp.push({ t: Math.random() * 100, factor, x, y, z });
    }
    return temp;
  }, [count]);

  useFrame(() => {
    if (!mesh.current) return;
    particles.forEach((particle, i) => {
      let { t, factor, x, y, z } = particle;
      t += speed * 0.01;
      particle.t = t;
      
      dummy.position.set(
        x + Math.sin(t * factor) * 2,
        y + Math.cos(t * factor) * 2,
        z
      );
      // Optional: slight scale pulse
      const s = 1 + Math.sin(t * factor * 2) * 0.2;
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[null, null, count]}>
      <sphereGeometry args={[0.08 * scale, 16, 16]} />
      <meshBasicMaterial color={color} transparent opacity={0.6} depthWrite={false} blending={THREE.AdditiveBlending} />
    </instancedMesh>
  );
}

export default function DashboardBackground() {
  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: -1, pointerEvents: 'none', opacity: 0.9 }}>
      <Canvas camera={{ position: [0, 0, 10], fov: 45 }}>
        <FloatingSpheres count={150} color="#9d4edd" scale={1} speed={1.5} />
        <FloatingSpheres count={100} color="#5e6ad2" scale={2} speed={2} />
      </Canvas>
    </div>
  );
}
