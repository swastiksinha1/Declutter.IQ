import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Instances, Instance, Center } from '@react-three/drei';
import * as THREE from 'three';

function Cluster({ isScanning, isCleaning }) {
  const group = useRef();
  const particleGroup = useRef();

  const count = 20;
  const dummy = useMemo(() => new THREE.Object3D(), []);
  
  // Base shapes (low poly)
  const particles = useMemo(() => {
    return Array.from({ length: 40 }).map(() => ({
      position: [
        (Math.random() - 0.5) * 4,
        (Math.random() - 0.5) * 4,
        (Math.random() - 0.5) * 4
      ],
      speed: Math.random() * 0.02 + 0.01,
      angle: Math.random() * Math.PI * 2
    }));
  }, []);

  useFrame((state, delta) => {
    // Slow auto-rotation
    if (group.current) {
      group.current.rotation.y += delta * 0.2;
      group.current.rotation.x += delta * 0.1;
    }

    if (particleGroup.current && isScanning) {
      particleGroup.current.rotation.y -= delta * 0.5;
      
      // Animate particles outward
      particles.forEach((p, i) => {
        p.position[1] += Math.sin(state.clock.elapsedTime * 2 + p.angle) * 0.01;
        p.position[0] += Math.cos(state.clock.elapsedTime * 2 + p.angle) * 0.01;
        
        dummy.position.set(p.position[0], p.position[1], p.position[2]);
        // Scale pulses slightly
        const s = 0.5 + Math.sin(state.clock.elapsedTime * 3 + i) * 0.2;
        dummy.scale.set(s, s, s);
        dummy.updateMatrix();
        particleGroup.current.children[i].matrix.copy(dummy.matrix);
      });
    }
  });

  return (
    <>
      <group ref={group}>
        <Instances limit={count} range={count}>
          <boxGeometry args={[0.5, 0.6, 0.1]} />
          <meshStandardMaterial color="#8B5CF6" transparent opacity={0.8} roughness={0.2} metalness={0.8} />
          {Array.from({ length: count }).map((_, i) => (
            <Instance
              key={i}
              position={[
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2
              ]}
              rotation={[Math.random() * Math.PI, Math.random() * Math.PI, 0]}
              scale={isCleaning ? (Math.random() > 0.5 ? 0.5 : 0) : 1} // Poor man's merge animation
            />
          ))}
        </Instances>
      </group>

      <group ref={particleGroup} visible={isScanning}>
        {particles.map((p, i) => (
          <mesh key={`p-${i}`} position={p.position}>
            <sphereGeometry args={[0.05, 4, 4]} />
            <meshBasicMaterial color="#00e5ff" transparent opacity={0.6} />
          </mesh>
        ))}
      </group>
    </>
  );
}

export default function SignatureVisual({ isScanning = false, isCleaning = false }) {
  return (
    <div style={{ width: '100%', height: '250px', marginTop: '2rem', borderRadius: '1rem', overflow: 'hidden', opacity: 0.8 }}>
      <Canvas camera={{ position: [0, 0, 5], fov: 45 }} dpr={[1, 1.5]}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} color="#8B5CF6" />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color="#00e5ff" />
        <Center>
          <Cluster isScanning={isScanning} isCleaning={isCleaning} />
        </Center>
      </Canvas>
    </div>
  );
}
