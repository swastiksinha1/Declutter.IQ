import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function RippleButton({ children, onClick, className, style, disabled }) {
  const [ripples, setRipples] = useState([]);
  const buttonRef = useRef(null);

  const handleClick = (e) => {
    if (disabled) return;
    
    const rect = buttonRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = Date.now();
    
    setRipples(prev => [...prev, { x, y, id }]);
    
    if (onClick) onClick(e);
  };

  useEffect(() => {
    if (ripples.length > 0) {
      const timer = setTimeout(() => {
        setRipples(prev => prev.slice(1));
      }, 500); // give it time to animate out
      return () => clearTimeout(timer);
    }
  }, [ripples]);

  return (
    <motion.button
      ref={buttonRef}
      className={className}
      style={{
        ...style,
        position: 'relative',
        overflow: 'hidden'
      }}
      onClick={handleClick}
      disabled={disabled}
      whileHover={disabled ? {} : { scale: 1.02 }}
      whileTap={disabled ? {} : { scale: 0.98 }}
    >
      <AnimatePresence>
        {ripples.map(ripple => (
          <motion.div
            key={ripple.id}
            initial={{ top: ripple.y, left: ripple.x, width: 0, height: 0, opacity: 0.6 }}
            animate={{ width: 300, height: 300, top: ripple.y - 150, left: ripple.x - 150, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            style={{
              position: 'absolute',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 70%)',
              pointerEvents: 'none',
              zIndex: 0
            }}
          />
        ))}
      </AnimatePresence>
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
        {children}
      </div>
    </motion.button>
  );
}
