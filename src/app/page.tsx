'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import WaitlistModal from '@/components/WaitlistModal';

import Galaxy from '@/components/Galaxy';

const FEATURES = [
  { icon: '⚡', title: 'Instant UI Updates', desc: 'Push UI changes in real-time — no new build, no Play Store wait.' },
  { icon: '☁️', title: 'Cloud-Driven Screens', desc: 'Define Compose layouts as JSON on your server, rendered natively.' },
  { icon: '🛡️', title: 'Open Source', desc: 'Built with Kotlin, composable-first, Apache 2.0 licensed.' },
];

export default function Home() {
  const [modalOpen, setModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setMounted(true);
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="page-shell">

      {/* Galaxy — absolute, fills the shell, z:0 */}
      {mounted && (
        <div className="aurora-layer">
          <Galaxy
            mouseRepulsion={false}
            mouseInteraction={false}
            density={1}
            glowIntensity={0.3}
            saturation={0}
            hueShift={140}
            twinkleIntensity={0.3}
            rotationSpeed={0.1}
            repulsionStrength={2}
            autoCenterRepulsion={0}
            starSpeed={0.5}
            speed={1}
          />
        </div>
      )}

      {/* Header — absolute top, z:20 */}
      <header className="top-bar">
        <div className="top-bar__logo">
          <div className="logo-mark">
            <Image src="/ketoy-logo.svg" alt="Ketoy" width={20} height={20} />
          </div>
          <span className="logo-text">ketoy.dev</span>
        </div>
        <div className="early-badge">
          <span className="early-badge__dot" />
          Early Access
        </div>
      </header>

      {/* Card — centered in the shell, z:10 */}
      <main className="center-stage">
        <div
          className="card"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(18px)',
            transition: 'opacity 0.55s ease, transform 0.55s ease',
          }}
        >
          {/* Top edge glow */}
          <div className="card__edge-glow" />


          {/* Brand */}
          <div className="brand-row">
            <div className="brand-logo">
              <Image src="/ketoy-logo.svg" alt="Ketoy" width={32} height={32} />
            </div>
            <div>
              <h1 className="brand-name">Ketoy - Console</h1>
              <p className="brand-url">ketoy.dev</p>
            </div>
          </div>

          {/* Description */}
          <p className="desc">
            The open source, server-driven UI engine for Jetpack Compose. Write K‑DSL, convert to JSON, render native UI. No Play Store approvals needed. Learn more
          </p>

          <hr className="card-divider" />

          <p className="card-hint">Be among the first Android teams to get early access</p>

          <button className="cta-btn" style={{ padding: '0.95rem' }} onClick={() => setModalOpen(true)}>
            Join the Waitlist →
          </button>

        </div>
      </main>

      {/* Footer — absolute bottom, z:20 */}
      <footer className="bottom-bar">
        <a href="https://ketoy.dev" target="_blank" rel="noopener noreferrer" className="foot-link">ketoy.dev</a>
        <span className="foot-sep">·</span>
        <a href="https://docs.ketoy.dev" target="_blank" rel="noopener noreferrer" className="foot-link">Docs</a>
        <span className="foot-sep">·</span>
        <a href="https://github.com/KetoyDev/ketoy" target="_blank" rel="noopener noreferrer" className="foot-link">GitHub</a>
        <span className="foot-sep">·</span>
        <span className="foot-copy">© 2025 Ketoy</span>
      </footer>

      <WaitlistModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
