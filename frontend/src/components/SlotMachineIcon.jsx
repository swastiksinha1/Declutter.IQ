import React, { useState, useEffect } from 'react';
import { ImageIcon, FileText, Music, Archive, Video, Folder, Brain } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ICONS = [ImageIcon, FileText, Music, Archive, Video, Folder];

export default function SlotMachineIcon({ isScanning, isSemantic, size = 18 }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!isScanning) {
      setIndex(0);
      return;
    }
    
    // Cycle every 150ms for a rapid slot-machine effect
    const interval = setInterval(() => {
      setIndex(prev => (prev + 1) % ICONS.length);
    }, 150);
    
    return () => clearInterval(interval);
  }, [isScanning]);

  const CurrentIcon = isSemantic ? Brain : ICONS[index];

  return (
    <div style={{ position: 'relative', width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      <AnimatePresence mode="popLayout">
        {isScanning ? (
          <motion.div
            key={index}
            initial={{ y: 20, opacity: 0, scale: 0.5 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -20, opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.15 }}
            style={{ position: 'absolute' }}
          >
            <CurrentIcon size={size} color="var(--brand-primary)" />
          </motion.div>
        ) : (
          <motion.div
            key="idle"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{ position: 'absolute' }}
          >
            {isSemantic ? <Brain size={size} /> : <SearchIconPlaceholder size={size} />}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Just a static fallback for the initial state
import { Search } from 'lucide-react';
function SearchIconPlaceholder({ size }) {
  return <Search size={size} />;
}
