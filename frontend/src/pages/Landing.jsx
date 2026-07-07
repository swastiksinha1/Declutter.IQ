import React, { useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Sparkles, Box, Cylinder } from '@react-three/drei';
import { motion } from 'framer-motion';

// A single floating file object
function FloatingFile({ initialPosition, color, speed, radiusOffset }) {
  const mesh = useRef();
  
  useFrame((state) => {
    if (!mesh.current) return;
    const t = state.clock.getElapsedTime();
    // Complex flow animation: Files orbiting and floating towards the center
    const angle = (t * speed * 0.3) + initialPosition[0];
    const radius = 3 + radiusOffset + Math.sin(t * speed * 0.5) * 1.5;
    
    mesh.current.position.x = Math.cos(angle) * radius;
    mesh.current.position.z = Math.sin(angle) * radius;
    mesh.current.position.y = initialPosition[1] + Math.sin(t * speed) * 0.5;
    
    mesh.current.rotation.x = Math.cos(t * speed) * 0.5;
    mesh.current.rotation.y = Math.sin(t * speed) * 0.5;
  });

  return (
    <Box ref={mesh} args={[0.6, 0.8, 0.05]} position={initialPosition}>
      <meshStandardMaterial color={color} roughness={0.1} metalness={0.9} />
    </Box>
  );
}

// A central "Organizer" or "Trash Can" cylinder
function CentralHub() {
  const mesh = useRef();
  
  useFrame((state) => {
    if (!mesh.current) return;
    mesh.current.rotation.y += 0.005;
    mesh.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
  });

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
      <Cylinder ref={mesh} args={[1.2, 0.8, 1.5, 32]} position={[0, -0.5, 0]}>
        <meshStandardMaterial color="#9d4edd" roughness={0.3} metalness={0.7} wireframe />
      </Cylinder>
    </Float>
  );
}

export default function Landing() {
  const navigate = useNavigate();

  // Generate some random files
  const files = useMemo(() => {
    const temp = [];
    const colors = ['#5e6ad2', '#d8b4fe', '#a5b4fc', '#ff453a', '#ffffff', '#9d4edd'];
    for (let i = 0; i < 25; i++) {
      temp.push({
        initialPosition: [(Math.random() - 0.5) * 10, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 10],
        color: colors[Math.floor(Math.random() * colors.length)],
        speed: 0.5 + Math.random(),
        radiusOffset: Math.random() * 3
      });
    }
    return temp;
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', background: 'radial-gradient(circle at center, #1a1a24 0%, #050505 100%)', overflow: 'hidden' }}>
      
      {/* 3D Canvas Background */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1 }}>
        <Canvas camera={{ position: [0, 2, 10], fov: 45 }}>
          <ambientLight intensity={0.4} />
          <directionalLight position={[10, 10, 5]} intensity={1.5} color="#9d4edd" />
          <pointLight position={[-10, -10, -10]} intensity={2} color="#5e6ad2" />
          
          <React.Suspense fallback={null}>
            <CentralHub />
            
            {files.map((props, i) => (
              <FloatingFile key={i} {...props} />
            ))}
            
            <Sparkles count={300} scale={15} size={2} speed={0.4} opacity={0.5} color="#d8b4fe" />
          </React.Suspense>
        </Canvas>
      </div>

      {/* Foreground UI */}
      <div style={{ 
        position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 10,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', paddingBottom: '12vh'
      }}>
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.5 }}
          style={{ textAlign: 'center', background: 'rgba(10,10,10,0.5)', padding: '2.5rem 5rem', borderRadius: '32px', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <h1 style={{ margin: '0 0 1rem 0', fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 700, color: 'white', textShadow: '0 0 20px rgba(157, 78, 221, 0.5)' }}>
            Unleash Your Storage
          </h1>
          <p style={{ margin: '0 0 2rem 0', color: 'var(--text-muted)', fontSize: '1.2rem' }}>
            Watch your duplicates disappear in real-time.
          </p>
          <button 
            className="btn btn-primary" 
            style={{ fontSize: '1.3rem', padding: '1.2rem 3rem', borderRadius: '99px', boxShadow: '0 10px 40px rgba(157, 78, 221, 0.5)', cursor: 'pointer', transition: 'transform 0.2s' }}
            onClick={() => navigate('/app')}
            onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
            onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
          >
            Let's go do the decluttering 🚀
          </button>
        </motion.div>
      </div>
    </div>
  );
}
