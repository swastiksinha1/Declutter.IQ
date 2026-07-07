import React, { useRef, useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Float, Sparkles, Box, Cylinder, RoundedBox, Html } from '@react-three/drei';
import { FileText, Music, FolderOpen, AlertTriangle, Image as ImageIcon, Video } from 'lucide-react';
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
      // Boom Shake
      const timeSinceBoom = t - BOOM_TIME;
      if (timeSinceBoom < 0.5) {
        // Smooth sine wave shake that damps over 0.5s
        const intensity = (0.5 - timeSinceBoom) * 1.5; 
        camera.position.x = Math.sin(t * 50) * intensity;
        camera.position.y = Math.cos(t * 45) * intensity;
        camera.position.z = 4 + Math.sin(t * 40) * intensity;
      } else {
        // Settle back to default
        camera.position.lerp(new THREE.Vector3(0, 2, 10), 0.05);
      }
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
      if (ambientRef.current) ambientRef.current.intensity = 0.4;
      if (lightRef.current) lightRef.current.intensity = 2;
    } else if (t >= ORBIT_DUR && t < BOOM_TIME) {
      // Dim lights for the collapse
      const progress = (t - ORBIT_DUR) / COLLAPSE_DUR;
      if (ambientRef.current) ambientRef.current.intensity = Math.max(0, 0.4 - progress * 0.4);
      if (lightRef.current) lightRef.current.intensity = Math.max(0, 2 - progress * 2);
    } else {
      // Flash at Boom
      const timeSinceBoom = t - BOOM_TIME;
      if (timeSinceBoom < 0.2) {
        if (ambientRef.current) ambientRef.current.intensity = 5; // Blinding flash
        if (lightRef.current) lightRef.current.intensity = 10;
      } else {
        // Fade back to normal
        if (ambientRef.current) ambientRef.current.intensity = THREE.MathUtils.lerp(ambientRef.current.intensity, 0.4, 0.05);
        if (lightRef.current) lightRef.current.intensity = THREE.MathUtils.lerp(lightRef.current.intensity, 2, 0.05);
      }
    }
  });

  return (
    <>
      <ambientLight ref={ambientRef} intensity={0.4} />
      <directionalLight position={[10, 10, 5]} intensity={1.5} color="#9d4edd" />
      <pointLight ref={lightRef} position={[-10, -10, -10]} intensity={2} color="#5e6ad2" />
    </>
  );
}

function FloatingFile({ initialPosition, color, speed, radiusOffset, iconType }) {
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
      mesh.current.rotation.x = Math.cos(t * speed) * 0.5;
      mesh.current.rotation.y = Math.sin(t * speed) * 0.5;
      mesh.current.scale.set(1, 1, 1);
    } else if (t >= ORBIT_DUR && t < BOOM_TIME) {
      const progress = (t - ORBIT_DUR) / COLLAPSE_DUR; 
      const easeProgress = Math.pow(progress, 2);
      mesh.current.position.lerp(new THREE.Vector3(0, 0, 0), easeProgress * 0.4);
      mesh.current.rotation.x += speed * 0.3;
      mesh.current.rotation.y += speed * 0.3;
      const scale = Math.max(0, 1 - Math.pow(progress, 4));
      mesh.current.scale.set(scale, scale, scale);
    } else {
      mesh.current.scale.set(0, 0, 0);
    }
  });

  return (
    <RoundedBox ref={mesh} position={initialPosition} args={[1.2, 1.6, 0.05]} radius={0.1} smoothness={2}>
      <meshStandardMaterial 
        color={color} 
        transparent={true}
        opacity={0.8}
        metalness={0.9} 
        roughness={0.1} 
      />
      {/* Front Icon */}
      <Html transform position={[0, 0, 0.03]} distanceFactor={4}>
        <div style={{ color: 'white', opacity: 0.9, filter: 'drop-shadow(0 0 15px rgba(255,255,255,0.6))' }}>
          {iconType === 'file' && <FileText size={72} strokeWidth={1.5} />}
          {iconType === 'audio' && <Music size={72} strokeWidth={1.5} />}
          {iconType === 'folder' && <FolderOpen size={72} strokeWidth={1.5} />}
          {iconType === 'spam' && <AlertTriangle size={72} strokeWidth={1.5} color="var(--danger)" />}
          {iconType === 'image' && <ImageIcon size={72} strokeWidth={1.5} />}
          {iconType === 'video' && <Video size={72} strokeWidth={1.5} />}
        </div>
      </Html>
    </RoundedBox>
  );
}

function CentralHub() {
  const mesh = useRef();
  
  useFrame((state) => {
    if (!mesh.current) return;
    const t = state.clock.elapsedTime;
    
    mesh.current.rotation.y += 0.005;
    mesh.current.rotation.z = Math.sin(t * 0.5) * 0.1;
    
    if (t < BOOM_TIME) {
      mesh.current.scale.set(0, 0, 0);
    } else {
      const progress = Math.min((t - BOOM_TIME) * 3, 1); 
      const scale = 1 * (1 - Math.pow(1 - progress, 3)); 
      mesh.current.scale.set(scale, scale, scale);
    }
  });

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
      <Cylinder ref={mesh} args={[1.2, 0.8, 1.5, 32]} position={[0, -0.5, 0]}>
        <meshStandardMaterial color="#9d4edd" roughness={0.3} metalness={0.7} wireframe emissive="#9d4edd" emissiveIntensity={2} />
      </Cylinder>
    </Float>
  );
}

function ExplosiveSparkles() {
  const ref = useRef();
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    if (t < BOOM_TIME) {
      ref.current.visible = false;
    } else {
      ref.current.visible = true;
    }
  });
  return (
    <group ref={ref}>
      <Sparkles count={500} scale={20} size={4} speed={2} opacity={1} color="#d8b4fe" />
    </group>
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

  const files = useMemo(() => {
    const temp = [];
    const colors = ['#5e6ad2', '#d8b4fe', '#a5b4fc', '#ff453a', '#ffffff', '#9d4edd'];
    const types = ['file', 'audio', 'folder', 'spam', 'image', 'video'];
    for (let i = 0; i < 35; i++) {
      temp.push({
        initialPosition: [(Math.random() - 0.5) * 12, (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 12],
        color: colors[Math.floor(Math.random() * colors.length)],
        iconType: types[Math.floor(Math.random() * types.length)],
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
            <CentralHub />
            <ExplosiveSparkles />
            {files.map((props, i) => (
              <FloatingFile key={i} {...props} />
            ))}
            
            <EffectComposer>
              <Bloom luminanceThreshold={0} luminanceSmoothing={0.9} height={300} intensity={1.5} />
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
