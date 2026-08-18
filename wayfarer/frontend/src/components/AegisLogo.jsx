import React from 'react';

export function AegisLogo({ size = 32, glow = true, className = "" }) {
  const glowFilter = glow ? "drop-shadow(0px 0px 12px rgba(0, 242, 254, 0.7))" : "none";

  return (
    <div 
      className={`aegis-nexus-logo ${className}`}
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
          <linearGradient id="wfNexusGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00f2fe" />
            <stop offset="35%" stopColor="#38bdf8" />
            <stop offset="70%" stopColor="#818cf8" />
            <stop offset="100%" stopColor="#c084fc" />
          </linearGradient>

          <linearGradient id="wfCoreCrystal" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="50%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#4f46e5" />
          </linearGradient>

          <radialGradient id="wfPlasmaFlare" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ec4899" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#8b5cf6" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#00f2fe" stopOpacity="0" />
          </radialGradient>
        </defs>

        <circle cx="50" cy="50" r="44" fill="url(#wfPlasmaFlare)" opacity="0.4" />

        <polygon
          points="50,6 88,28 88,72 50,94 12,72 12,28"
          stroke="url(#wfNexusGrad)"
          strokeWidth="1.75"
          fill="#070b14"
          fillOpacity="0.85"
          strokeDasharray="4 2"
        />

        <ellipse
          cx="50"
          cy="50"
          rx="38"
          ry="14"
          stroke="#00f2fe"
          strokeWidth="1.5"
          transform="rotate(-28 50 50)"
          opacity="0.85"
        />

        <ellipse
          cx="50"
          cy="50"
          rx="38"
          ry="14"
          stroke="#c084fc"
          strokeWidth="1.5"
          transform="rotate(38 50 50)"
          opacity="0.85"
        />

        <polygon
          points="50,18 78,50 50,82 22,50"
          stroke="url(#wfNexusGrad)"
          strokeWidth="2"
          fill="#0c1222"
          fillOpacity="0.9"
        />

        <line x1="50" y1="18" x2="50" y2="82" stroke="#38bdf8" strokeWidth="1.2" opacity="0.75" />
        <line x1="22" y1="50" x2="78" y2="50" stroke="#38bdf8" strokeWidth="1.2" opacity="0.75" />
        <line x1="36" y1="34" x2="64" y2="66" stroke="#818cf8" strokeWidth="1" opacity="0.6" />
        <line x1="36" y1="66" x2="64" y2="34" stroke="#818cf8" strokeWidth="1" opacity="0.6" />

        <circle cx="50" cy="50" r="7.5" fill="url(#wfCoreCrystal)" />
        <circle cx="50" cy="50" r="3.5" fill="#ffffff" />

        <circle cx="50" cy="6" r="2.5" fill="#00f2fe" />
        <circle cx="88" cy="28" r="2" fill="#38bdf8" />
        <circle cx="88" cy="72" r="2" fill="#818cf8" />
        <circle cx="50" cy="94" r="2.5" fill="#c084fc" />
        <circle cx="12" cy="72" r="2" fill="#818cf8" />
        <circle cx="12" cy="28" r="2" fill="#38bdf8" />
      </svg>
    </div>
  );
}
