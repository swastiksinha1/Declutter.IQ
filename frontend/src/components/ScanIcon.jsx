import React from 'react';
import { Search, Brain, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ScanIcon({ isScanning, isSemantic, size = 18 }) {
  const StaticIcon = isSemantic ? Brain : Search;

  return (
    <div style={{ position: 'relative', width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <AnimatePresence mode="popLayout">
        {isScanning ? (
          <motion.div
            key="scanning"
            initial={{ opacity: 0, scale: 0.8, rotate: -90 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.8, rotate: 90 }}
            transition={{ duration: 0.3 }}
            style={{ position: 'absolute' }}
          >
            <Loader2 
              size={size} 
              color={isSemantic ? "var(--brand-primary)" : "var(--text-main)"} 
              className="spin-slow" 
            />
          </motion.div>
        ) : (
          <motion.div
            key="idle"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.3 }}
            style={{ position: 'absolute' }}
          >
            <StaticIcon size={size} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
