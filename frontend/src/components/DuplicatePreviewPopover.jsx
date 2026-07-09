import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function DuplicatePreviewPopover({ group, children }) {
  const [show, setShow] = useState(false);

  const isImg = (ext) => ['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.gif'].includes(ext?.toLowerCase());
  
  if (!group || !group.files || group.files.length < 2) {
    return <>{children}</>;
  }

  const file1 = group.files[0];
  const file2 = group.files[1];
  const areImages = isImg(file1.extension) && isImg(file2.extension);
  
  let confidence = null;
  if (group.similarity !== undefined) confidence = (group.similarity * 100).toFixed(1);
  if (group.confidence !== undefined) confidence = (group.confidence * 100).toFixed(1);

  return (
    <div 
      style={{ position: 'relative', width: '100%' }} 
      onMouseEnter={() => setShow(true)} 
      onMouseLeave={() => setShow(false)}
      onTouchStart={() => setShow(prev => !prev)}
    >
      {children}
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'absolute',
              bottom: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 100,
              marginBottom: '0.8rem',
              width: 'max-content',
              maxWidth: '500px',
              background: 'rgba(20, 20, 25, 0.95)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '16px',
              padding: '1.5rem',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255,255,255,0.1)',
              pointerEvents: 'none',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}
          >
            {confidence && (
              <div style={{ alignSelf: 'center', background: 'rgba(157, 78, 221, 0.2)', color: '#d8b4fe', padding: '0.3rem 0.8rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600, border: '1px solid rgba(157, 78, 221, 0.4)' }}>
                {confidence}% Match
              </div>
            )}

            {areImages ? (
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                <img src={`http://127.0.0.1:5000/api/file?path=${encodeURIComponent(file1.path)}`} alt="Preview 1" style={{ width: '160px', height: '160px', objectFit: 'cover', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }} />
                <div style={{ display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }}>VS</div>
                <img src={`http://127.0.0.1:5000/api/file?path=${encodeURIComponent(file2.path)}`} alt="Preview 2" style={{ width: '160px', height: '160px', objectFit: 'cover', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }} />
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                {[file1, file2].map((f, i) => (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: 1, minWidth: '160px', maxWidth: '200px', background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={f.filename}>
                      {f.filename}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--brand-primary)' }}>
                      {(f.size / 1024).toFixed(1)} KB
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={f.path}>
                      {f.path}
                    </div>
                    {f.mtime && (
                       <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
                         Modified: {new Date(f.mtime * 1000).toLocaleDateString()}
                       </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
