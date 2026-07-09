import React, { useEffect, useRef } from 'react';
import { useMotionValue, useSpring } from 'framer-motion';

export default function AnimatedCounter({ value, suffix = "", decimals = 0, duration = 800 }) {
  const ref = useRef(null);
  const motionValue = useMotionValue(0);
  
  // stiffness and damping set to approximate ~800ms ease out
  const springValue = useSpring(motionValue, {
    stiffness: 120,
    damping: 25,
    restDelta: 0.1
  });

  useEffect(() => {
    if (typeof value === 'number') {
      motionValue.set(value);
    }
  }, [value, motionValue]);

  useEffect(() => {
    if (typeof value !== 'number') return;
    
    return springValue.on("change", (latest) => {
      if (ref.current) {
        if (decimals > 0) {
          ref.current.textContent = Number(latest).toFixed(decimals);
        } else {
          ref.current.textContent = Intl.NumberFormat('en-US').format(Math.floor(latest));
        }
      }
    });
  }, [springValue, value, decimals]);

  if (typeof value !== 'number') {
    return <>{value}{suffix}</>;
  }

  return <><span ref={ref}>0</span>{suffix}</>;
}
