import React, { useState } from 'react';
import { AegisLogo } from './AegisLogo';

export function NavigationDock({ activeTab, onSelectTab, isOnline = true }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <header className="aegis-command-dock-wrapper">
      <div 
        className="aegis-command-dock"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Left: Brand Nexus Core */}
        <div className="dock-brand-zone">
          <div className="dock-brand-icon">
            <AegisLogo size={36} />
            <div className="dock-brand-pulse"></div>
          </div>
          <div className="dock-brand-meta">
            <div className="dock-brand-title">
              <span className="brand-glow-text">AEGIS</span>
              <span className="brand-version-pill">v2.5</span>
            </div>
            <div className="dock-brand-sub">OMNISCIENT NEURAL CORE</div>
          </div>
        </div>

        {/* Center: Two Big Maximalist Animated App Portals */}
        <nav className="dock-portals-zone">
          {/* Portal 1: Wayfarer Deep Research */}
          <button
            id="portal-wayfarer-btn"
            className={`dock-portal-card wayfarer-portal ${activeTab === 'research' ? 'active' : ''}`}
            onClick={() => onSelectTab('research')}
            title="Switch to Wayfarer Deep Research (Shortcut: 1)"
          >
            <div className="portal-glow-backdrop"></div>
            
            {/* Big Animated Cosmic Astrolabe Icon */}
            <div className="portal-icon-container">
              <svg className="portal-svg wayfarer-svg" viewBox="0 0 60 60" fill="none">
                <defs>
                  <linearGradient id="wfGlowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#00f2fe" />
                    <stop offset="60%" stopColor="#38bdf8" />
                    <stop offset="100%" stopColor="#818cf8" />
                  </linearGradient>
                  <radialGradient id="wfSunCore" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="40%" stopColor="#00f2fe" />
                    <stop offset="100%" stopColor="#0284c7" stopOpacity="0" />
                  </radialGradient>
                </defs>
                
                {/* Radar sweep glow sector */}
                <circle cx="30" cy="30" r="26" stroke="#00f2fe" strokeWidth="1" strokeDasharray="3 3" opacity="0.4" className="radar-sweep" />
                
                {/* Rotating Outer Gyro Ring */}
                <ellipse cx="30" cy="30" rx="24" ry="9" stroke="url(#wfGlowGrad)" strokeWidth="1.5" className="astrolabe-ring-1" />
                <ellipse cx="30" cy="30" rx="24" ry="9" stroke="#818cf8" strokeWidth="1.2" className="astrolabe-ring-2" />
                
                {/* Crosshairs */}
                <line x1="30" y1="4" x2="30" y2="56" stroke="#38bdf8" strokeWidth="0.75" strokeDasharray="2 2" opacity="0.5" />
                <line x1="4" y1="30" x2="56" y2="30" stroke="#38bdf8" strokeWidth="0.75" strokeDasharray="2 2" opacity="0.5" />
                
                {/* Planetary Orbiting Probe */}
                <circle cx="48" cy="22" r="2.5" fill="#00f2fe" className="orbit-probe" />
                <circle cx="14" cy="38" r="2" fill="#c084fc" className="orbit-probe-alt" />
                
                {/* Luminous Central Star / Research Sun */}
                <circle cx="30" cy="30" r="9" fill="url(#wfSunCore)" />
                <circle cx="30" cy="30" r="4" fill="#ffffff" />
              </svg>
            </div>

            {/* Portal Content Details */}
            <div className="portal-text-block">
              <div className="portal-header-row">
                <span className="portal-name">WAYFARER</span>
                <span className="portal-chip wf-chip">AGENTIC WEB</span>
              </div>
              <div className="portal-desc-row">
                <span className="portal-status-dot"></span>
                <span>Deep Research & 3D HUD</span>
              </div>
            </div>

            <div className="portal-shortcut-badge">[ 1 ]</div>
            <div className="portal-active-laser"></div>
          </button>

          {/* Portal 2: DockMind Document Intelligence RAG */}
          <button
            id="portal-dockmind-btn"
            className={`dock-portal-card dockmind-portal ${activeTab === 'chat' ? 'active' : ''}`}
            onClick={() => onSelectTab('chat')}
            title="Switch to DockMind Document Chat (Shortcut: 2)"
          >
            <div className="portal-glow-backdrop"></div>
            
            {/* Big Animated Neural Cortex / Vector Hyper-Cube Icon */}
            <div className="portal-icon-container">
              <svg className="portal-svg dockmind-svg" viewBox="0 0 60 60" fill="none">
                <defs>
                  <linearGradient id="dmGlowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="50%" stopColor="#06b6d4" />
                    <stop offset="100%" stopColor="#8b5cf6" />
                  </linearGradient>
                  <radialGradient id="dmCortexCore" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="40%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#047857" stopOpacity="0" />
                  </radialGradient>
                </defs>

                {/* Isometric Hyper-Cube Frame */}
                <polygon points="30,6 50,17 50,41 30,52 10,41 10,17" stroke="url(#dmGlowGrad)" strokeWidth="1.5" fill="#06121a" fillOpacity="0.8" className="hypercube-frame" />
                
                {/* Internal Synaptic Connectors */}
                <line x1="30" y1="6" x2="30" y2="30" stroke="#10b981" strokeWidth="1.2" opacity="0.8" />
                <line x1="50" y1="17" x2="30" y2="30" stroke="#06b6d4" strokeWidth="1.2" opacity="0.8" />
                <line x1="50" y1="41" x2="30" y2="30" stroke="#8b5cf6" strokeWidth="1.2" opacity="0.8" />
                <line x1="30" y1="52" x2="30" y2="30" stroke="#10b981" strokeWidth="1.2" opacity="0.8" />
                <line x1="10" y1="41" x2="30" y2="30" stroke="#06b6d4" strokeWidth="1.2" opacity="0.8" />
                <line x1="10" y1="17" x2="30" y2="30" stroke="#8b5cf6" strokeWidth="1.2" opacity="0.8" />

                {/* Vector Data Synapse Pulses */}
                <circle cx="30" cy="6" r="2.5" fill="#10b981" className="synapse-node-1" />
                <circle cx="50" cy="17" r="2.5" fill="#06b6d4" className="synapse-node-2" />
                <circle cx="50" cy="41" r="2.5" fill="#8b5cf6" className="synapse-node-3" />
                <circle cx="30" cy="52" r="2.5" fill="#10b981" className="synapse-node-4" />
                <circle cx="10" cy="41" r="2.5" fill="#06b6d4" className="synapse-node-5" />
                <circle cx="10" cy="17" r="2.5" fill="#8b5cf6" className="synapse-node-6" />

                {/* Central Luminous RAG Nexus */}
                <circle cx="30" cy="30" r="9" fill="url(#dmCortexCore)" />
                <circle cx="30" cy="30" r="4" fill="#ffffff" />
              </svg>
            </div>

            {/* Portal Content Details */}
            <div className="portal-text-block">
              <div className="portal-header-row">
                <span className="portal-name">DOCKMIND</span>
                <span className="portal-chip dm-chip">VECTOR RAG</span>
              </div>
              <div className="portal-desc-row">
                <span className="portal-status-dot dm-dot"></span>
                <span>Document Chat & ChromaDB</span>
              </div>
            </div>

            <div className="portal-shortcut-badge">[ 2 ]</div>
            <div className="portal-active-laser dm-laser"></div>
          </button>
        </nav>

        {/* Right: Telemetry & Hardware Status */}
        <div className="dock-telemetry-zone">
          <div className="telemetry-pill">
            <span className="telemetry-pulse"></span>
            <span className="telemetry-label">LOCAL 8085</span>
          </div>
          <div className="telemetry-sub">
            <span className="telemetry-sub-icon">⚡</span>
            <span>OFFLINE ZERO-CLOUD</span>
          </div>
        </div>
      </div>
    </header>
  );
}
