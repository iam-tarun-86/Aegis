import React from 'react';

export function AegisLogo({ size = 36, glow = true, className = "" }) {
  const glowFilter = glow ? "drop-shadow(0px 0px 12px rgba(56, 189, 248, 0.6))" : "none";

  return (
    <div 
      className={`aegis-logo-wrapper ${className}`}
      style={{ 
        width: size, 
        height: size, 
        display: 'inline-flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        filter: glowFilter,
        flexShrink: 0
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Main Shield Outer Gradient */}
          <linearGradient id="aegisShieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00f2fe" />
            <stop offset="45%" stopColor="#38bdf8" />
            <stop offset="75%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>

          {/* Inner Core Cyber Armor Gradient */}
          <linearGradient id="aegisCoreGrad" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="60%" stopColor="#38bdf8" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#1e1b4b" stopOpacity="0.9" />
          </linearGradient>

          {/* Subtle Glow Filter */}
          <filter id="coreGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Outer Tech Shield Frame */}
        <path
          d="M50 8 L85 24 V52 C85 72 68 88 50 94 C32 88 15 72 15 52 V24 L50 8 Z"
          fill="url(#aegisShieldGrad)"
          stroke="#38bdf8"
          strokeWidth="2"
          strokeLinejoin="round"
          opacity="0.9"
        />

        {/* Inner Armor Geometry */}
        <path
          d="M50 16 L77 28.5 V50 C77 66 64 79 50 84 C36 79 23 66 23 50 V28.5 L50 16 Z"
          fill="#090d16"
          stroke="url(#aegisShieldGrad)"
          strokeWidth="1.5"
          opacity="0.95"
        />

        {/* Central Futuristic Stylized "A" Cyber Glyph */}
        <path
          d="M50 26 L68 64 H56 L50 48 L44 64 H32 L50 26 Z"
          fill="url(#aegisCoreGrad)"
          filter="url(#coreGlow)"
        />

        {/* Core Quantum Energy Bar */}
        <polygon
          points="41,54 59,54 55,60 45,60"
          fill="#00f2fe"
          opacity="0.9"
        />

        {/* Orbit Node Accent Top */}
        <circle cx="50" cy="18" r="2.5" fill="#ffffff" />
        <circle cx="50" cy="84" r="2" fill="#38bdf8" />
      </svg>
    </div>
  );
}
