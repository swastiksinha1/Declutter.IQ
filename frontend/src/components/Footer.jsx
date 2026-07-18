import React from 'react';
import { Code, Globe, MessageCircle, Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer style={{
      background: 'rgba(10, 10, 15, 0.8)',
      backdropFilter: 'blur(10px)',
      borderTop: '1px solid rgba(255, 255, 255, 0.05)',
      padding: '2rem 0',
      color: 'var(--text-muted)',
      textAlign: 'center',
      zIndex: 100,
      position: 'relative',
      marginTop: 'auto'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1rem',
        padding: '0 2rem'
      }}>
        <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '0.5rem' }}>
          <a href="#" style={{ color: 'inherit', transition: 'color 0.2s' }} onMouseOver={e => e.target.style.color = '#9d4edd'} onMouseOut={e => e.target.style.color = 'inherit'}>
            <Code size={20} />
          </a>
          <a href="#" style={{ color: 'inherit', transition: 'color 0.2s' }} onMouseOver={e => e.target.style.color = '#1DA1F2'} onMouseOut={e => e.target.style.color = 'inherit'}>
            <Globe size={20} />
          </a>
          <a href="#" style={{ color: 'inherit', transition: 'color 0.2s' }} onMouseOver={e => e.target.style.color = '#ea4335'} onMouseOut={e => e.target.style.color = 'inherit'}>
            <MessageCircle size={20} />
          </a>
        </div>
        
        <p style={{ margin: 0, fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
          Built with <Heart size={14} color="#ff453a" fill="#ff453a" /> for a clutter-free world.
        </p>
        
        <div style={{ fontSize: '0.8rem', opacity: 0.6, marginTop: '0.5rem' }}>
          &copy; {new Date().getFullYear()} Declutter.IQ. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
