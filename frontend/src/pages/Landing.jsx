import React, { useRef, useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Billboard, Image } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { motion, AnimatePresence } from 'framer-motion';
import * as THREE from 'three';

// Constants for timing
const ORBIT_DUR = 3.0;
const COLLAPSE_DUR = 1.0;
const BOOM_TIME = ORBIT_DUR + COLLAPSE_DUR; // 4.0s

function CameraController() {
  const { camera } = useThree();
  
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    
    if (t < ORBIT_DUR) {
      // Slow pan
      camera.position.x = Math.sin(t * 0.2) * 2;
      camera.position.y = 2 + Math.cos(t * 0.2) * 1;
      camera.position.z = 10;
      camera.lookAt(0, 0, 0);
    } else if (t >= ORBIT_DUR && t < BOOM_TIME) {
      // Dramatic Zoom In
      const progress = (t - ORBIT_DUR) / COLLAPSE_DUR;
      camera.position.lerp(new THREE.Vector3(0, 0, 4), progress * 0.1);
      camera.lookAt(0, 0, 0);
    } else {
      // Settle back to default (Removed Boom Shake)
      camera.position.lerp(new THREE.Vector3(0, 2, 10), 0.05);
      camera.lookAt(0, 0, 0);
    }
  });
  return null;
}

function DynamicLighting() {
  const lightRef = useRef();
  const ambientRef = useRef();
  
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    
    if (t < ORBIT_DUR) {
      if (ambientRef.current) ambientRef.current.intensity = 0.8;
      if (lightRef.current) lightRef.current.intensity = 2;
    } else if (t >= ORBIT_DUR && t < BOOM_TIME) {
      const progress = (t - ORBIT_DUR) / COLLAPSE_DUR;
      if (ambientRef.current) ambientRef.current.intensity = Math.max(0, 0.8 - progress * 0.5);
      if (lightRef.current) lightRef.current.intensity = Math.max(0, 2 - progress * 1.5);
    } else {
      if (ambientRef.current) ambientRef.current.intensity = THREE.MathUtils.lerp(ambientRef.current.intensity, 0.8, 0.05);
      if (lightRef.current) lightRef.current.intensity = THREE.MathUtils.lerp(lightRef.current.intensity, 2, 0.05);
    }
  });

  return (
    <>
      <ambientLight ref={ambientRef} intensity={0.8} />
      <directionalLight position={[10, 10, 5]} intensity={1.5} color="#ffffff" />
      <pointLight ref={lightRef} position={[-10, -10, -10]} intensity={2} color="#ffffff" />
    </>
  );
}

function FloatingIcon({ initialPosition, speed, radiusOffset, iconUrl }) {
  const mesh = useRef();
  
  useFrame((state) => {
    if (!mesh.current) return;
    const t = state.clock.elapsedTime;
    
    if (t < ORBIT_DUR) {
      const angle = (t * speed * 0.3) + initialPosition[0];
      const radius = 3 + radiusOffset + Math.sin(t * speed * 0.5) * 1.5;
      mesh.current.position.x = Math.cos(angle) * radius;
      mesh.current.position.z = Math.sin(angle) * radius;
      mesh.current.position.y = initialPosition[1] + Math.sin(t * speed) * 0.5;
      mesh.current.scale.set(1.5, 1.5, 1.5); // Good size for Billboard icons
    } else if (t >= ORBIT_DUR && t < BOOM_TIME) {
      const progress = (t - ORBIT_DUR) / COLLAPSE_DUR; 
      const easeProgress = Math.pow(progress, 2);
      mesh.current.position.lerp(new THREE.Vector3(0, 0, 0), easeProgress * 0.4);
      const scale = Math.max(0, 1.5 - Math.pow(progress, 4) * 1.5);
      mesh.current.scale.set(scale, scale, scale);
    } else {
      mesh.current.scale.set(0, 0, 0);
    }
  });

  return (
    <Billboard ref={mesh} position={initialPosition} follow={true} lockX={false} lockY={false} lockZ={false}>
      <Image url={iconUrl} transparent opacity={0.9} />
    </Billboard>
  );
}

export default function Landing() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState(1);

  useEffect(() => {
    const timer1 = setTimeout(() => setPhase(2), ORBIT_DUR * 1000);
    const timer2 = setTimeout(() => setPhase(3), BOOM_TIME * 1000);
    return () => { clearTimeout(timer1); clearTimeout(timer2); };
  }, []);

  const icons = useMemo(() => {
    const temp = [];
    const iconUrls = [
      'https://img.icons8.com/color/512/folder-invoices.png', // Folder
      'https://img.icons8.com/color/512/vlc.png', // VLC
      'https://img.icons8.com/color/512/pdf.png', // PDF
      'https://img.icons8.com/color/512/microsoft-word-2019.png', // Word
      'https://img.icons8.com/color/512/image.png', // Image
      'https://img.icons8.com/color/512/mp3.png' // MP3
    ];
    
    for (let i = 0; i < 40; i++) {
      temp.push({
        initialPosition: [(Math.random() - 0.5) * 12, (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 12],
        iconUrl: iconUrls[Math.floor(Math.random() * iconUrls.length)],
        speed: 0.8 + Math.random() * 1.5,
        radiusOffset: Math.random() * 4
      });
    }
    return temp;
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', background: 'radial-gradient(circle at center, #1a1a24 0%, #050505 100%)', overflow: 'hidden' }}>
      
      {/* 3D Canvas Background */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1 }}>
        <Canvas camera={{ position: [0, 2, 10], fov: 45 }}>
          <CameraController />
          <DynamicLighting />
          
          <React.Suspense fallback={null}>
            {/* Removed CentralHub and ExplosiveSparkles */}
            {icons.map((props, i) => (
              <FloatingIcon key={i} {...props} />
            ))}
            
            <EffectComposer>
              <Bloom luminanceThreshold={0.5} luminanceSmoothing={0.9} height={300} intensity={0.5} />
            </EffectComposer>
          </React.Suspense>
        </Canvas>
      </div>

      {/* Foreground UI - Only visible in Phase 3 */}
      <div style={{ 
        position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 10,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', paddingBottom: '12vh',
        pointerEvents: phase === 3 ? 'auto' : 'none'
      }}>
        <AnimatePresence>
          {phase === 3 && (
            <motion.div 
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.2 }}
              style={{ textAlign: 'center', width: '100%', maxWidth: '800px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
            >
              <h1 style={{ margin: '0 0 1rem 0', fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 700, color: 'white', textShadow: '0 0 20px rgba(157, 78, 221, 0.5)' }}>
                Unleash Your Storage
              </h1>
              <p style={{ margin: '0 0 2rem 0', color: 'var(--text-muted)', fontSize: '1.2rem' }}>
                Watch your duplicates disappear in real-time.
              </p>
              <button 
                className="btn btn-primary" 
                style={{ fontSize: '1.3rem', padding: '1.2rem 3rem', borderRadius: '99px', boxShadow: '0 10px 40px rgba(157, 78, 221, 0.5)', cursor: 'pointer', transition: 'transform 0.2s', pointerEvents: 'auto' }}
                onClick={() => navigate('/app')}
                onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
                onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
              >
                Let's go do the decluttering 🚀
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
