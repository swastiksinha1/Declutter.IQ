import React from 'react';
import { motion } from 'framer-motion';
import { HardDrive, BrainCircuit } from 'lucide-react';

export default function ScanVisualizer({ isSemantic }) {
  const color = isSemantic ? 'var(--brand-primary)' : 'var(--danger)';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '6rem 0' }}>
      <div style={{ position: 'relative', width: '120px', height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {/* Outer pulsing ring */}
        <motion.div
          animate={{ scale: [1, 1.5, 2], opacity: [0.8, 0.3, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          style={{ position: 'absolute', width: '100%', height: '100%', border: `2px solid ${color}`, borderRadius: '50%' }}
        />
        <motion.div
          animate={{ scale: [1, 1.3, 1.8], opacity: [0.8, 0.2, 0] }}
          transition={{ duration: 2, delay: 0.5, repeat: Infinity, ease: "linear" }}
          style={{ position: 'absolute', width: '100%', height: '100%', border: `2px solid ${color}`, borderRadius: '50%' }}
        />
        
        {/* Inner solid circle */}
        <div style={{ width: '80px', height: '80px', background: 'rgba(20,20,20,0.8)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', boxShadow: `0 0 30px ${color}40` }}>
          {isSemantic ? <BrainCircuit size={36} color={color} /> : <HardDrive size={36} color={color} />}
        </div>
      </div>
      
      <motion.h3 
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity }}
        style={{ marginTop: '3rem', fontSize: '1.5rem', fontWeight: 600, color: 'white' }}
      >
        {isSemantic ? 'Deep AI Analysis in Progress...' : 'Scanning Drive...'}
      </motion.h3>
      <p style={{ color: 'var(--text-muted)', fontSize: '1rem', marginTop: '0.5rem' }}>
        {isSemantic ? 'Understanding the conceptual meaning of your files.' : 'Recursively hashing and indexing all documents.'}
      </p>
    </div>
  );
}
