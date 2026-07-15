import React from 'react';
import { motion } from 'framer-motion';
import { HardDrive, BrainCircuit } from 'lucide-react';

export default function ScanVisualizer({ isSemantic }) {
  const color = isSemantic ? 'var(--brand-primary)' : 'var(--danger)';
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '6rem 0' }}>
      <div style={{ position: 'relative', width: '90px', height: '90px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {/* Sleek Dashed Spinning Ring */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          style={{ 
            position: 'absolute', width: '100%', height: '100%', 
            border: `1px dashed ${color}`, borderRadius: '50%', opacity: 0.6 
          }}
        />
        
        {/* Smooth Inner Glow Ring */}
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          style={{ 
            position: 'absolute', width: '75%', height: '75%', 
            border: `2px solid transparent`, borderTopColor: color, borderBottomColor: color, 
            borderRadius: '50%', opacity: 0.8 
          }}
        />
        
        {/* Inner solid circle */}
        <div style={{ width: '60px', height: '60px', background: 'rgba(20,20,20,0.9)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, border: '1px solid rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)', boxShadow: `0 0 20px ${color}30` }}>
          {isSemantic ? <BrainCircuit size={28} color={color} /> : <HardDrive size={28} color={color} />}
        </div>
      </div>
      
      <motion.h3 
        animate={{ opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 2, repeat: Infinity }}
        style={{ marginTop: '2.5rem', fontSize: '1.25rem', fontWeight: 500, color: 'white', letterSpacing: '0.02em' }}
      >
        {isSemantic ? 'AI Semantic Analysis' : 'Scanning Directory'}
      </motion.h3>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
        {isSemantic ? 'Processing vector embeddings...' : 'Indexing file metadata...'}
      </p>
    </div>
  );
}
