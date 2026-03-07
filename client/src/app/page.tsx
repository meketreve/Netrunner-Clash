'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function HomePage() {
  const [hoveredBtn, setHoveredBtn] = useState<string | null>(null);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      zIndex: 1,
      gap: '40px',
      padding: '32px',
    }}>
      {/* Logo */}
      <div style={{ textAlign: 'center', animation: 'fadeIn 0.8s ease' }}>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(2rem, 6vw, 4rem)',
          fontWeight: 900,
          color: 'var(--cyan)',
          textShadow: '0 0 20px var(--cyan), 0 0 40px var(--cyan), 0 0 80px rgba(0,240,255,0.3)',
          letterSpacing: '0.1em',
          lineHeight: 1.1,
        }}>
          NETRUNNER<br />
          <span style={{ color: 'var(--magenta)', textShadow: '0 0 20px var(--magenta), 0 0 40px var(--magenta)' }}>
            CLASH
          </span>
        </h1>
        <p style={{
          fontFamily: 'var(--font-body)',
          fontSize: '1rem',
          color: 'var(--text-secondary)',
          marginTop: '12px',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
        }}>
          Card Game PvP &bull; Cyberpunk &bull; Por Turnos
        </p>
      </div>

      {/* Decorative card fan */}
      <div style={{
        display: 'flex',
        gap: '4px',
        transform: 'perspective(800px) rotateX(10deg)',
        animation: 'float 3s ease-in-out infinite',
      }}>
        {['🤖', '⚔️', '💀', '🛡️', '👻'].map((emoji, i) => (
          <div key={i} style={{
            width: '60px',
            height: '85px',
            background: 'var(--bg-card)',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.8rem',
            border: '1px solid var(--border-glow)',
            transform: `rotate(${(i - 2) * 8}deg) translateY(${Math.abs(i - 2) * 5}px)`,
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
          }}>
            {emoji}
          </div>
        ))}
      </div>

      {/* Menu buttons */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        width: '100%',
        maxWidth: '320px',
        animation: 'slideUp 0.8s ease 0.3s both',
      }}>
        <Link href="/game" style={{ textDecoration: 'none' }}>
          <button
            className="cyber-btn"
            style={{ width: '100%', padding: '16px 32px', fontSize: '1rem' }}
            onMouseEnter={() => setHoveredBtn('play')}
            onMouseLeave={() => setHoveredBtn(null)}
          >
            🎮 JOGAR
          </button>
        </Link>

        <Link href="/collection" style={{ textDecoration: 'none' }}>
          <button
            className="cyber-btn cyber-btn--magenta"
            style={{ width: '100%', padding: '16px 32px', fontSize: '1rem' }}
            onMouseEnter={() => setHoveredBtn('collection')}
            onMouseLeave={() => setHoveredBtn(null)}
          >
            📦 COLEÇÃO
          </button>
        </Link>

      </div>

      {/* Footer */}
      <p style={{
        color: 'var(--text-muted)',
        fontSize: '0.7rem',
        fontFamily: 'var(--font-display)',
        letterSpacing: '0.1em',
        position: 'absolute',
        bottom: '20px',
      }}>
        POWERED BY NEXT.JS + SPACETIMEDB
      </p>
    </div>
  );
}
