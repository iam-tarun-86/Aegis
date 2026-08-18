import React, { useState, useEffect } from 'react';
import { AegisLogo } from './AegisLogo';

export function SlideNavDrawer({ activeTab, onSelectTab, onReturnHome }) {
  const [isOpen, setIsOpen] = useState(false);

  // Close drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const currentAppName = activeTab === 'research' ? 'Wayfarer' : 'DockMind';
  const currentAppColor = activeTab === 'research' ? '#00f2fe' : '#10b981';

  return (
    <>
      {/* Sleek Floating Cyber Pill Trigger (Top Left Edge - Zero Overlap) */}
      <div className="aegis-floating-trigger-wrapper">
        <button 
          id="aegis-nav-trigger"
          className={`aegis-pill-trigger ${isOpen ? 'active' : ''}`}
          onClick={() => setIsOpen(!isOpen)}
          title="Open Aegis App Switcher (Shortcut: Tab / Esc)"
        >
          <AegisLogo size={22} glow={false} />
          <div className="trigger-text-group">
            <span className="trigger-brand">AEGIS</span>
            <span className="trigger-sep">/</span>
            <span className="trigger-app" style={{ color: currentAppColor }}>
              {currentAppName}
            </span>
          </div>
          <div className="trigger-chevron">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d={isOpen ? "M18 15l-6-6-6 6" : "M6 9l6 6 6-6"} />
            </svg>
          </div>
        </button>
      </div>

      {/* Backdrop overlay when open */}
      <div 
        className={`drawer-backdrop ${isOpen ? 'visible' : ''}`}
        onClick={() => setIsOpen(false)}
      />

      {/* Slide-out Maximalist Command Drawer */}
      <aside className={`aegis-slide-drawer ${isOpen ? 'open' : ''}`}>
        <div className="drawer-inner">
          {/* Drawer Header */}
          <div className="drawer-header">
            <div className="drawer-brand-row">
              <AegisLogo size={36} />
              <div className="drawer-brand-text">
                <span className="drawer-title">AEGIS</span>
                <span className="drawer-sub">OMNISCIENT HUB</span>
              </div>
            </div>

            <button 
              className="drawer-close-btn"
              onClick={() => setIsOpen(false)}
              title="Close Switcher (Esc)"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Navigation Section */}
          <div className="drawer-section-title">ACTIVE PLATFORMS</div>

          <div className="drawer-apps-list">
            {/* App 1: Wayfarer */}
            <div 
              className={`drawer-app-card ${activeTab === 'research' ? 'current' : ''}`}
              onClick={() => {
                onSelectTab('research');
                setIsOpen(false);
              }}
              role="button"
              tabIndex={0}
            >
              <div className="drawer-app-icon wf-icon">
                <svg viewBox="0 0 60 60" fill="none">
                  <ellipse cx="30" cy="30" rx="22" ry="8" stroke="#00f2fe" strokeWidth="1.5" className="astrolabe-ring-1" />
                  <ellipse cx="30" cy="30" rx="22" ry="8" stroke="#818cf8" strokeWidth="1.2" className="astrolabe-ring-2" />
                  <circle cx="30" cy="30" r="6" fill="#00f2fe" fillOpacity="0.4" />
                  <circle cx="30" cy="30" r="3.5" fill="#ffffff" />
                </svg>
              </div>

              <div className="drawer-app-info">
                <div className="drawer-app-title-row">
                  <span className="drawer-app-name">Wayfarer</span>
                  <span className="drawer-key-pill">[ 1 ]</span>
                </div>
                <span className="drawer-app-desc">Deep Research & 3D Celestial HUD</span>
              </div>

              {activeTab === 'research' && <div className="drawer-active-indicator">ACTIVE</div>}
            </div>

            {/* App 2: DockMind */}
            <div 
              className={`drawer-app-card ${activeTab === 'chat' ? 'current' : ''}`}
              onClick={() => {
                onSelectTab('chat');
                setIsOpen(false);
              }}
              role="button"
              tabIndex={0}
            >
              <div className="drawer-app-icon dm-icon">
                <svg viewBox="0 0 60 60" fill="none">
                  <polygon points="30,8 48,18 48,40 30,50 12,40 12,18" stroke="#10b981" strokeWidth="1.5" fill="#06121a" />
                  <circle cx="30" cy="30" r="6" fill="#10b981" fillOpacity="0.4" />
                  <circle cx="30" cy="30" r="3.5" fill="#ffffff" />
                </svg>
              </div>

              <div className="drawer-app-info">
                <div className="drawer-app-title-row">
                  <span className="drawer-app-name">DockMind</span>
                  <span className="drawer-key-pill">[ 2 ]</span>
                </div>
                <span className="drawer-app-desc">Document Intelligence & ChromaDB RAG</span>
              </div>

              {activeTab === 'chat' && <div className="drawer-active-indicator dm-ind">ACTIVE</div>}
            </div>
          </div>

          {/* Return to Launchpad Home Button */}
          <button 
            className="drawer-home-btn"
            onClick={() => {
              onReturnHome();
              setIsOpen(false);
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            <span>Return to Portal Launchpad</span>
          </button>

          {/* Drawer Footer Telemetry */}
          <div className="drawer-footer">
            <div className="drawer-telemetry">
              <span className="drawer-pulse-dot"></span>
              <span>LOCAL 8085 • ZERO-CLOUD OFFLINE</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
