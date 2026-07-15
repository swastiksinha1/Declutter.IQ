import React, { useRef, useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'framer-motion';
import LandingHero from '../components/LandingHero';

const PHASE1_DUR = 2.5; // Chaos
const PHASE2_DUR = 2.5; // Organizing
const BOOM_TIME = PHASE1_DUR + PHASE2_DUR; // 5.0s

function DataParticles() {
  const count = 600;
  const mesh = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Pre-calculate target grid positions and random initial positions
  const particles = useMemo(() => {
    const temp = [];
    const gridSize = Math.ceil(Math.pow(count, 1/3));
    const spacing = 0.8;
    const offset = (gridSize * spacing) / 2;

    for (let i = 0; i < count; i++) {
      // Chaotic starting position
      const startX = (Math.random() - 0.5) * 20;
      const startY = (Math.random() - 0.5) * 20;
      const startZ = (Math.random() - 0.5) * 20;

      // Target grid position
      const x = (i % gridSize) * spacing - offset;
      const y = (Math.floor(i / gridSize) % gridSize) * spacing - offset;
      const z = (Math.floor(i / (gridSize * gridSize))) * spacing - offset;

      // Determine if this is a "duplicate" (will be dissolved)
      const isDuplicate = Math.random() > 0.3; // 70% are duplicates

      temp.push({ 
        startX, startY, startZ, 
        targetX: x, targetY: y, targetZ: z, 
        isDuplicate,
        randomSpeed: Math.random() * 2 + 0.5
      });
    }
    return temp;
  }, [count]);

  useFrame((state) => {
    if (!mesh.current) return;
    const t = state.clock.elapsedTime;

    particles.forEach((p, i) => {
      let x, y, z;
      let scale = 1.0;
      let rotation = 0;

      if (t < PHASE1_DUR) {
        // Phase 1: Chaos - slowly drifting
        x = p.startX + Math.sin(t * p.randomSpeed) * 2;
        y = p.startY + Math.cos(t * p.randomSpeed) * 2;
        z = p.startZ + Math.sin(t * p.randomSpeed * 0.8) * 2;
        rotation = t * p.randomSpeed;
      } else if (t < BOOM_TIME) {
        // Phase 2: Organizing - lerping to grid
        const progress = (t - PHASE1_DUR) / PHASE2_DUR;
        // Easing function (cubic in-out)
        const ease = progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2;
        
        const currentDriftX = Math.sin(PHASE1_DUR * p.randomSpeed) * 2;
        const currentDriftY = Math.cos(PHASE1_DUR * p.randomSpeed) * 2;
        const currentDriftZ = Math.sin(PHASE1_DUR * p.randomSpeed * 0.8) * 2;

        x = THREE.MathUtils.lerp(p.startX + currentDriftX, p.targetX, ease);
        y = THREE.MathUtils.lerp(p.startY + currentDriftY, p.targetY, ease);
        z = THREE.MathUtils.lerp(p.startZ + currentDriftZ, p.targetZ, ease);
        rotation = THREE.MathUtils.lerp(PHASE1_DUR * p.randomSpeed, 0, ease);
      } else {
        // Phase 3: Cleanup - dissolving duplicates
        x = p.targetX;
        y = p.targetY;
        z = p.targetZ;
        
        if (p.isDuplicate) {
          const dissolveProgress = Math.min((t - BOOM_TIME) * 2, 1);
          scale = 1.0 - dissolveProgress;
        } else {
          // Highlight unique files
          scale = 1.0 + Math.sin(t * 2 + i) * 0.1;
        }
      }

      dummy.position.set(x, y, z);
      dummy.rotation.set(rotation, rotation, rotation);
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);
    });

    mesh.current.instanceMatrix.needsUpdate = true;
    
    // Smoothly rotate the whole grid
    mesh.current.rotation.y = t * 0.1;
    mesh.current.rotation.x = Math.sin(t * 0.05) * 0.2;
  });

  return (
    <instancedMesh ref={mesh} args={[null, null, count]}>
      <boxGeometry args={[0.15, 0.15, 0.15]} />
      <meshStandardMaterial color="#9d4edd" metalness={0.8} roughness={0.2} emissive="#5e6ad2" emissiveIntensity={0.5} />
    </instancedMesh>
  );
}

function CinematicCamera() {
  const { camera } = useThree();
  
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    
    if (t < PHASE1_DUR) {
      // Pan through chaos
      camera.position.x = Math.sin(t * 0.2) * 5;
      camera.position.z = 15 - t;
      camera.lookAt(0, 0, 0);
    } else if (t < BOOM_TIME) {
      // Pull back to reveal grid
      const progress = (t - PHASE1_DUR) / PHASE2_DUR;
      const ease = 1 - Math.pow(1 - progress, 3);
      camera.position.lerp(new THREE.Vector3(0, 2, 12), ease * 0.1);
      camera.lookAt(0, 0, 0);
    } else {
      // Steady gentle orbit
      camera.position.lerp(new THREE.Vector3(0, 2, 12), 0.05);
      camera.lookAt(0, 0, 0);
    }
  });
  return null;
}

export default function Landing() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => setPhase(3), BOOM_TIME * 1000 + 500); // Slight delay for UI fade in
    return () => clearTimeout(timer);
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', background: 'radial-gradient(circle at center, #1a1a24 0%, #050505 100%)', overflow: 'hidden' }}>
      
      {/* 3D Canvas Background */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1 }}>
        <Canvas camera={{ position: [0, 0, 15], fov: 45 }}>
          <CinematicCamera />
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={2} color="#d8b4fe" />
          
          <React.Suspense fallback={null}>
            <DataParticles />
            <EffectComposer>
              <Bloom luminanceThreshold={0.2} luminanceSmoothing={0.9} height={300} intensity={1.2} />
            </EffectComposer>
          </React.Suspense>
        </Canvas>
      </div>

      {/* Foreground UI - Sleek LandingHero integration */}
      <div style={{ 
        position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 10,
        pointerEvents: phase === 3 ? 'auto' : 'none'
      }}>
        <AnimatePresence>
          {phase === 3 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}
            >
              <LandingHero />
              
              <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
                <motion.button 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.8 }}
                  className="btn btn-primary" 
                  style={{ 
                    fontSize: '1.2rem', padding: '1rem 3rem', borderRadius: '99px', 
                    boxShadow: '0 10px 40px rgba(157, 78, 221, 0.4)', 
                    cursor: 'pointer', pointerEvents: 'auto',
                    background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)',
                    border: '1px solid rgba(255,255,255,0.1)'
                  }}
                  onClick={() => navigate('/app')}
                  whileHover={{ scale: 1.05, boxShadow: '0 15px 50px rgba(157, 78, 221, 0.6)' }}
                  whileTap={{ scale: 0.95 }}
                >
                  Start Decluttering Sequence
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
