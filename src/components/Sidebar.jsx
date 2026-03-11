import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Upload, Package, Truck, Store, History, ShieldCheck, X, Sparkles, LayoutDashboard } from 'lucide-react';

/* ─── NAV ITEMS ─────────────────────────────────────────────────────────── */
const navItems = [
  { id: 'dashboard', label: 'Command Center', icon: LayoutDashboard },
  { id: 'analysis', label: 'Analysis', icon: Upload },
  { id: 'logistics', label: 'Logistics & Dispatch', icon: Package },
  { id: 'transit', label: 'In Transit', icon: Truck },
  { id: 'retailer', label: 'At Retailer', icon: Store },
  { id: 'history', label: 'History', icon: History },
];

const techStack = ['React', 'Gemini AI', 'Polygon Web3', 'Firebase'];

/* ─── ABOUT MODAL ───────────────────────────────────────────────────────── */
const AboutModal = ({ onClose }) => {
  /* Close on Escape key */
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return ReactDOM.createPortal(
    <>
      {/* ── Inline styles for the modal (framework-agnostic) ───────────── */}
      <style>{`
        @keyframes ss-modal-in {
          from { opacity: 0; transform: scale(0.95) translateY(12px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);    }
        }
        @keyframes ss-backdrop-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .ss-backdrop {
          position: fixed;
          inset: 0;
          z-index: 200;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          background: rgba(0,0,0,0.65);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          animation: ss-backdrop-in 220ms ease forwards;
        }
        .ss-modal-card {
          position: relative;
          width: 100%;
          max-width: 480px;
          background: #0B0E14;
          border: 1px solid rgba(255,255,255,0.10);
          border-radius: 20px;
          padding: 36px 32px 28px 32px;
          overflow: hidden;
          box-shadow:
            0 0 0 1px rgba(56,189,248,0.08),
            0 0 50px rgba(56,189,248,0.12),
            0 24px 64px rgba(0,0,0,0.55);
          animation: ss-modal-in 260ms cubic-bezier(0.16,1,0.3,1) forwards;
        }
        /* Decorative top-edge glow */
        .ss-modal-card::before {
          content: '';
          position: absolute;
          top: 0; left: 50%; transform: translateX(-50%);
          width: 60%;
          height: 1px;
          background: linear-gradient(90deg,
            transparent,
            rgba(56,189,248,0.5) 40%,
            rgba(99,102,241,0.5) 60%,
            transparent);
        }
        .ss-close-btn {
          position: absolute;
          top: 14px; right: 14px;
          width: 32px; height: 32px;
          display: flex; align-items: center; justify-content: center;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.04);
          color: #6b7280;
          cursor: pointer;
          transition: background 180ms ease, color 180ms ease;
        }
        .ss-close-btn:hover {
          background: rgba(255,255,255,0.10);
          color: #ffffff;
        }
        .ss-modal-logo {
          width: 64px; height: 64px;
          display: flex; align-items: center; justify-content: center;
          border-radius: 16px;
          background: linear-gradient(135deg, #00FF9D, #10B981);
          box-shadow:
            0 0 0 8px rgba(0,255,157,0.08),
            0 0 30px rgba(0,255,157,0.45);
          margin: 0 auto 16px auto;
        }
        .ss-modal-title {
          font-size: 28px;
          font-weight: 800;
          text-align: center;
          background: linear-gradient(90deg, #60a5fa, #38BDF8);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin: 0 0 6px 0;
          letter-spacing: -0.02em;
        }
        .ss-modal-tagline {
          text-align: center;
          color: #38BDF8;
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin: 0 0 24px 0;
          opacity: 0.8;
        }
        .ss-modal-divider {
          height: 1px;
          background: rgba(255,255,255,0.06);
          margin: 0 -32px 22px -32px;
        }
        .ss-modal-body p {
          font-size: 14px;
          line-height: 1.75;
          color: #9ca3af;
          margin: 0 0 14px 0;
        }
        .ss-modal-body p:last-child { margin-bottom: 0; }
        .ss-modal-body strong { color: #e2e8f0; font-weight: 600; }
        .ss-stack-row {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          justify-content: center;
          margin-top: 24px;
          padding-top: 20px;
          border-top: 1px solid rgba(255,255,255,0.06);
        }
        .ss-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 5px 14px;
          border-radius: 9999px;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.04em;
          color: #9ca3af;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.09);
          transition: background 200ms ease, color 200ms ease, border-color 200ms ease;
        }
        .ss-badge:hover {
          background: rgba(56,189,248,0.10);
          border-color: rgba(56,189,248,0.3);
          color: #38BDF8;
        }
        .ss-badge-dot {
          width: 5px; height: 5px;
          border-radius: 50%;
          background: currentColor;
          opacity: 0.6;
        }
      `}</style>

      {/* ── Backdrop (click to close) ───────────────────────────────────── */}
      <div className="ss-backdrop" onClick={onClose}>

        {/* ── Modal Card (stop propagation so clicks inside don't close) ── */}
        <div className="ss-modal-card" onClick={(e) => e.stopPropagation()}>

          {/* Close button */}
          <button className="ss-close-btn" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>

          {/* Glowing logo */}
          <div className="ss-modal-logo">
            <ShieldCheck size={30} color="#ffffff" />
          </div>

          {/* Title */}
          <h2 className="ss-modal-title">SeedSecure</h2>
          <p className="ss-modal-tagline">Next-Gen Agricultural Trust</p>

          <div className="ss-modal-divider" />

          {/* Description */}
          <div className="ss-modal-body">
            <p>
              <strong>SeedSecure</strong> is a decentralized supply chain platform
              designed to eliminate counterfeit seeds in agriculture — protecting
              farmers, manufacturers, and the entire food ecosystem.
            </p>
            <p>
              By combining <strong>Google Gemini AI</strong> for visual purity
              analysis and <strong>Polygon Blockchain</strong> for immutable
              on-chain tracking, we ensure that every seed packet reaching the
              farmer is <strong>100% authentic</strong> and traceable from
              factory to field.
            </p>
          </div>

          {/* Tech Stack Badges */}
          <div className="ss-stack-row">
            {techStack.map((tech) => (
              <span key={tech} className="ss-badge">
                <span className="ss-badge-dot" />
                {tech}
              </span>
            ))}
          </div>

        </div>
      </div>
    </>,
    document.body
  );
};

/* ─── SIDEBAR ───────────────────────────────────────────────────────────── */
const Sidebar = ({ activeTab, setActiveTab, expanded, setExpanded }) => {
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);

  return (
    <>
      {/* ── Sidebar-specific CSS ──────────────────────────────────────── */}
      <style>{`
        .ss-sidebar {
          position: fixed;
          left: 0;
          top: 0;
          height: 100vh;
          overflow-y: hidden;
          display: flex;
          flex-direction: column;
          flex-shrink: 0;
          background: rgba(26, 32, 53, 0.85);
          border-right: 1px solid rgba(255,255,255,0.05);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          z-index: 1000;
          overflow: hidden;
          transition: width 280ms cubic-bezier(0.4,0,0.2,1);
          user-select: none;
        }

        .ss-logo-row {
          display: flex;
          align-items: center;
          height: 80px;
          padding: 0 12px;
          flex-shrink: 0;
          cursor: pointer;
        }
        .ss-logo-box {
          min-width: 48px;
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          background: linear-gradient(135deg, #00FF9D, #10B981);
          box-shadow: 0 0 22px rgba(0,255,157,0.45);
          flex-shrink: 0;
          transition: transform 200ms ease, box-shadow 200ms ease;
        }
        .ss-logo-row:hover .ss-logo-box {
          transform: scale(1.07);
          box-shadow: 0 0 28px rgba(0,255,157,0.6);
        }

        .ss-label {
          white-space: nowrap;
          overflow: hidden;
          transition: opacity 200ms ease;
          pointer-events: none;
        }

        .ss-brand-text {
          margin-left: 16px;
          font-size: 17px;
          font-weight: 700;
          letter-spacing: 0.02em;
          color: #ffffff;
        }
        .ss-divider {
          height: 1px;
          margin: 0 12px;
          background: rgba(255,255,255,0.05);
          flex-shrink: 0;
        }
        .ss-nav {
          display: flex;
          flex-direction: column;
          margin-top: 12px;
          flex: 1;
          min-height: 0;
        }
        .ss-nav-btn {
          display: flex;
          align-items: center;
          height: 48px;
          margin: 0 12px 4px 12px;
          border-radius: 12px;
          border: none;
          background: transparent;
          cursor: pointer;
          transition: background 200ms ease, color 200ms ease, box-shadow 200ms ease;
          outline: none;
          color: rgba(255,255,255,0.5);
        }
        .ss-nav-btn:hover {
          background: rgba(255,255,255,0.08);
          color: #ffffff;
        }
        .ss-nav-btn.active {
          background: rgba(0, 255, 157, 0.08);
          color: #ffffff;
          box-shadow: 0 0 18px rgba(0, 255, 157, 0.25), inset 0 0 0 1px rgba(0, 255, 157, 0.35);
        }
        .ss-icon-wrap {
          min-width: 48px;
          width: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .ss-icon-wrap svg {
          color: rgba(255,255,255,0.5);
          transition: color 200ms ease, filter 200ms ease;
        }
        .ss-nav-btn:hover .ss-icon-wrap svg {
          color: #ffffff;
          filter: drop-shadow(0 0 8px rgba(0, 255, 157, 0.6));
        }
        .ss-nav-btn.active .ss-icon-wrap svg {
          color: #ffffff;
          filter: drop-shadow(0 0 10px rgba(0,255,157,0.9));
        }
        .ss-nav-label {
          margin-left: 4px;
          font-size: 13px;
          font-weight: 600;
        }
        .ss-active-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: #38BDF8;
          box-shadow: 0 0 8px rgba(56,189,248,0.8);
          flex-shrink: 0;
          margin-left: auto;
          margin-right: 8px;
          opacity: 1;
          transition: opacity 200ms ease;
        }
        .ss-sidebar:hover .ss-active-dot { opacity: 0; }
        .ss-footer {
          display: flex;
          align-items: center;
          height: 56px;
          padding: 0 12px;
          flex-shrink: 0;
          margin-top: auto;
          border-top: 1px solid rgba(255,255,255,0.05);
        }
        .ss-version-pill {
          min-width: 48px;
          width: 48px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          background: rgba(255,255,255,0.05);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.08em;
          color: #8B949E;
          flex-shrink: 0;
        }
        .ss-footer-text {
          font-size: 11px;
          font-weight: 500;
          color: #8B949E;
          letter-spacing: 0.06em;
          margin-left: 14px;
        }
      `}</style>

      {/* ── SIDEBAR ─────────────────────────────────────────────────────── */}
      <aside
        className="ss-sidebar"
        onMouseEnter={() => setExpanded?.(true)}
        onMouseLeave={() => setExpanded?.(false)}
        style={{ width: expanded ? 260 : 80 }}
      >

        {/* Logo — click opens About modal */}
        <div
          className="ss-logo-row"
          onClick={() => setIsAboutModalOpen(true)}
          title="About SeedSecure"
        >
          <div className="ss-logo-box">
            <ShieldCheck size={20} color="#ffffff" />
          </div>
          <span className="ss-label ss-brand-text" style={{ opacity: expanded ? 1 : 0 }}>SeedSecure</span>
        </div>

        <div className="ss-divider" />

        {/* Navigation */}
        <nav className="ss-nav">
          {navItems.map(({ id, label, icon: Icon }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`ss-nav-btn${isActive ? ' active' : ''}`}
              >
                <div className="ss-icon-wrap">
                  <Icon size={20} />
                </div>
                <span className="ss-label ss-nav-label" style={{ opacity: expanded ? 1 : 0 }}>{label}</span>
                {isActive && <span className="ss-active-dot" />}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="ss-footer">
          <div className="ss-version-pill">v1</div>
          <span className="ss-label ss-footer-text" style={{ opacity: expanded ? 1 : 0 }}>SeedSecure · Beta</span>
        </div>

      </aside>

      {/* ── ABOUT MODAL (portal → document.body) ────────────────────────── */}
      {isAboutModalOpen && (
        <AboutModal onClose={() => setIsAboutModalOpen(false)} />
      )}
    </>
  );
};

export default Sidebar;
