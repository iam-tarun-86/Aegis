import React from 'react';
import { AegisLogo } from './AegisLogo';

export function PortalLaunchpad({ onSelectApp, wayfarerReady, dockmindReady }) {
  return (
    <div className="aegis-launchpad-container">
      {/* Background Cyber Mesh & Particles */}
      <div className="launchpad-ambient-bg">
        <div className="launchpad-grid-lines"></div>
        <div className="launchpad-glow-orb-cyan"></div>
        <div className="launchpad-glow-orb-violet"></div>
      </div>

      {/* Main Center Content */}
      <div className="launchpad-center-card">
        {/* Luminous Brand Singularity Header */}
        <div className="launchpad-brand-header">
          <div className="launchpad-logo-box">
            <AegisLogo size={80} />
            <div className="launchpad-logo-halo"></div>
          </div>
          <h1 className="launchpad-title">AEGIS</h1>
          <p className="launchpad-subtitle">Autonomous Research & Document Intelligence Nexus</p>
          <div className="launchpad-badge-row">
            <span className="launchpad-tech-pill">100% OFFLINE</span>
            <span className="launchpad-tech-pill">LOCAL GGUF • 8085</span>
            <span className="launchpad-tech-pill">ZERO-CLOUD</span>
          </div>
        </div>

        {/* 2 Big Maximalist Hero App Portals */}
        <div className="launchpad-portals-grid">
          {/* Portal 1: WAYFARER */}
          <div 
            id="launchpad-wayfarer"
            className="hero-portal-card wayfarer-hero"
            onClick={() => onSelectApp('research')}
            role="button"
            tabIndex={0}
          >
            <div className="hero-card-glow"></div>
            
            <div className="hero-top-row">
              <div className="hero-icon-wrapper wf-icon-bg">
                <svg className="hero-svg" viewBox="0 0 60 60" fill="none">
                  <defs>
                    <linearGradient id="heroWfGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#00f2fe" />
                      <stop offset="60%" stopColor="#38bdf8" />
                      <stop offset="100%" stopColor="#818cf8" />
                    </linearGradient>
                  </defs>
                  <circle cx="30" cy="30" r="26" stroke="#00f2fe" strokeWidth="1" strokeDasharray="3 3" opacity="0.4" className="radar-sweep" />
                  <ellipse cx="30" cy="30" rx="24" ry="9" stroke="url(#heroWfGrad)" strokeWidth="1.6" className="astrolabe-ring-1" />
                  <ellipse cx="30" cy="30" rx="24" ry="9" stroke="#818cf8" strokeWidth="1.2" className="astrolabe-ring-2" />
                  <circle cx="48" cy="22" r="2.5" fill="#00f2fe" className="orbit-probe" />
                  <circle cx="30" cy="30" r="8" fill="#38bdf8" fillOpacity="0.3" />
                  <circle cx="30" cy="30" r="4.5" fill="#ffffff" />
                </svg>
              </div>
              <div className="hero-key-badge">KEY: 1</div>
            </div>

            <div className="hero-info">
              <div className="hero-name-row">
                <h2 className="hero-name">WAYFARER</h2>
                <span className="hero-tag wf-tag">AGENTIC WEB</span>
              </div>
              <p className="hero-desc">
                Multi-agent LangGraph research engine with 3D celestial HUD, live reconnaissance radar, and automated cited report synthesis.
              </p>
              
              <div className="hero-feature-tags">
                <span>Playwright Headless</span>
                <span>DuckDuckGo Search</span>
                <span>Section Refinement</span>
              </div>
            </div>

            <button className="hero-launch-btn wf-btn">
              <span>ENTER CONSOLE</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </button>
          </div>

          {/* Portal 2: DOCKMIND */}
          <div 
            id="launchpad-dockmind"
            className="hero-portal-card dockmind-hero"
            onClick={() => onSelectApp('chat')}
            role="button"
            tabIndex={0}
          >
            <div className="hero-card-glow"></div>

            <div className="hero-top-row">
              <div className="hero-icon-wrapper dm-icon-bg">
                <svg className="hero-svg" viewBox="0 0 60 60" fill="none">
                  <defs>
                    <linearGradient id="heroDmGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#10b981" />
                      <stop offset="50%" stopColor="#06b6d4" />
                      <stop offset="100%" stopColor="#8b5cf6" />
                    </linearGradient>
                  </defs>
                  <polygon points="30,6 50,17 50,41 30,52 10,41 10,17" stroke="url(#heroDmGrad)" strokeWidth="1.6" fill="#06121a" fillOpacity="0.8" />
                  <line x1="30" y1="6" x2="30" y2="30" stroke="#10b981" strokeWidth="1.2" opacity="0.8" />
                  <line x1="50" y1="17" x2="30" y2="30" stroke="#06b6d4" strokeWidth="1.2" opacity="0.8" />
                  <line x1="50" y1="41" x2="30" y2="30" stroke="#8b5cf6" strokeWidth="1.2" opacity="0.8" />
                  <line x1="30" y1="52" x2="30" y2="30" stroke="#10b981" strokeWidth="1.2" opacity="0.8" />
                  <line x1="10" y1="41" x2="30" y2="30" stroke="#06b6d4" strokeWidth="1.2" opacity="0.8" />
                  <line x1="10" y1="17" x2="30" y2="30" stroke="#8b5cf6" strokeWidth="1.2" opacity="0.8" />
                  <circle cx="30" cy="6" r="2.5" fill="#10b981" className="synapse-node-1" />
                  <circle cx="50" cy="17" r="2.5" fill="#06b6d4" className="synapse-node-2" />
                  <circle cx="50" cy="41" r="2.5" fill="#8b5cf6" className="synapse-node-3" />
                  <circle cx="30" cy="30" r="8" fill="#10b981" fillOpacity="0.3" />
                  <circle cx="30" cy="30" r="4.5" fill="#ffffff" />
                </svg>
              </div>
              <div className="hero-key-badge">KEY: 2</div>
            </div>

            <div className="hero-info">
              <div className="hero-name-row">
                <h2 className="hero-name">DOCKMIND</h2>
                <span className="hero-tag dm-tag">VECTOR RAG</span>
              </div>
              <p className="hero-desc">
                Local-first document intelligence workspace with Docling document parser, ChromaDB embeddings, and multi-session RAG chat.
              </p>
              
              <div className="hero-feature-tags">
                <span>Docling High-Fidelity</span>
                <span>ChromaDB Vector Store</span>
                <span>Persistent Memory</span>
              </div>
            </div>

            <button className="hero-launch-btn dm-btn">
              <span>ENTER WORKSPACE</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </button>
          </div>
        </div>

        {/* Bottom Status Telemetry Footer */}
        <div className="launchpad-footer">
          <div className="footer-status-pill">
            <span className="footer-pulse-dot"></span>
            <span>SYSTEM ONLINE • ALL LOCAL SUBSYSTEMS READY</span>
          </div>
        </div>
      </div>
    </div>
  );
}
