import { motion } from 'framer-motion';
import { HardDrive, BrainCircuit, Sparkles, Image as ImageIcon } from 'lucide-react';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.1
    }
  }
};

const itemLeft = {
  hidden: { opacity: 0, x: -50, rotateY: 20 },
  visible: { opacity: 1, x: 0, rotateY: 0, transition: { type: 'spring', stiffness: 100, damping: 20 } }
};

const itemRight = {
  hidden: { opacity: 0, x: 50, rotateY: -20 },
  visible: { opacity: 1, x: 0, rotateY: 0, transition: { type: 'spring', stiffness: 100, damping: 20 } }
};

const itemUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100, damping: 20 } }
};

export default function LandingHero() {
  return (
    <div style={{
      width: '100%', 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center',
      padding: '4rem 2rem',
      perspective: '1200px'
    }}>
      
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '3rem',
          maxWidth: '1000px',
          width: '100%',
          transformStyle: 'preserve-3d'
        }}
      >
        {/* Main Hero Text */}
        <motion.div variants={itemUp} style={{ textAlign: 'center', marginBottom: '1rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(157, 78, 221, 0.15)', color: '#d8b4fe', padding: '0.5rem 1.2rem', borderRadius: '99px', fontSize: '0.9rem', fontWeight: '500', marginBottom: '1.5rem', border: '1px solid rgba(157, 78, 221, 0.3)' }}>
            <Sparkles size={16} /> Intelligent Storage Optimization
          </div>
          <h1 style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', margin: '0 0 1rem 0', fontWeight: '700', lineHeight: 1.1 }}>
            Reclaim your space with <br />
            <span style={{ background: 'linear-gradient(90deg, #9d4edd, #5e6ad2)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Declutter.IQ
            </span>
          </h1>
          <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)', maxWidth: '600px', margin: '0 auto', lineHeight: 1.6 }}>
            Use advanced AI, semantic matching, and fast hashing to instantly identify exact duplicates, similar images, and forgotten clutter across your drive.
          </p>
        </motion.div>

        {/* 3D Floating Cards Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '2rem',
          width: '100%',
          marginTop: '2rem',
          transformStyle: 'preserve-3d'
        }}>
          
          {/* Card 1 */}
          <motion.div 
            variants={itemLeft}
            whileHover={{ scale: 1.05, rotateX: 5, rotateY: -5 }}
            style={{
              background: 'rgba(20,20,20,0.6)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.05)',
              borderRadius: '24px',
              padding: '2rem',
              boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
              transformStyle: 'preserve-3d',
              cursor: 'default'
            }}
          >
            <div style={{ background: 'linear-gradient(135deg, rgba(94, 106, 210, 0.2), rgba(94, 106, 210, 0.05))', width: '50px', height: '50px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a5b4fc', marginBottom: '1.5rem' }}>
              <HardDrive size={24} />
            </div>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem', color: 'var(--text-main)' }}>Deep Scanning</h3>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.5 }}>
              Lightning fast recursive analysis of folders to find large zombies and redundant files.
            </p>
          </motion.div>

          {/* Card 2 */}
          <motion.div 
            variants={itemUp}
            whileHover={{ scale: 1.05, rotateX: 0, rotateY: 0 }}
            style={{
              background: 'rgba(20,20,20,0.6)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(157, 78, 221, 0.3)',
              borderRadius: '24px',
              padding: '2rem',
              boxShadow: '0 30px 60px rgba(157, 78, 221, 0.1)',
              transform: 'translateZ(30px)',
              position: 'relative',
              cursor: 'default'
            }}
          >
            <div style={{ position: 'absolute', top: '-10px', right: '-10px', background: 'var(--brand-primary)', color: 'white', fontSize: '0.7rem', padding: '0.3rem 0.8rem', borderRadius: '99px', fontWeight: 'bold' }}>AI POWERED</div>
            <div style={{ background: 'linear-gradient(135deg, rgba(157, 78, 221, 0.2), rgba(157, 78, 221, 0.05))', width: '50px', height: '50px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d8b4fe', marginBottom: '1.5rem' }}>
              <BrainCircuit size={24} />
            </div>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem', color: 'var(--text-main)' }}>Semantic Search</h3>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.5 }}>
              Understands the actual contents of your documents to group conceptual duplicates automatically.
            </p>
          </motion.div>

          {/* Card 3 */}
          <motion.div 
            variants={itemRight}
            whileHover={{ scale: 1.05, rotateX: 5, rotateY: 5 }}
            style={{
              background: 'rgba(20,20,20,0.6)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.05)',
              borderRadius: '24px',
              padding: '2rem',
              boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
              transformStyle: 'preserve-3d',
              cursor: 'default'
            }}
          >
            <div style={{ background: 'linear-gradient(135deg, rgba(255, 69, 58, 0.2), rgba(255, 69, 58, 0.05))', width: '50px', height: '50px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ff453a', marginBottom: '1.5rem' }}>
              <ImageIcon size={24} />
            </div>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem', color: 'var(--text-main)' }}>Visual Grouping</h3>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.5 }}>
              Detects resized, cropped, or slightly altered images even if their hash doesn't match perfectly.
            </p>
          </motion.div>

        </div>
      </motion.div>
    </div>
  );
}
