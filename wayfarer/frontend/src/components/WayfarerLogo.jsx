import React from 'react';

export function WayfarerLogo({ size = 28, className = "" }) {
  return (
    <div 
      className={`wayfarer-logo-emblem ${className}`}
      style={{ 
        width: size, 
        height: size, 
        display: 'inline-flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        filter: 'drop-shadow(0px 0px 10px rgba(0, 242, 254, 0.6))',
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
          <linearGradient id="wfLogoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00f2fe" />
            <stop offset="50%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#818cf8" />
          </linearGradient>
          <linearGradient id="wfCraftInner" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="60%" stopColor="#00f2fe" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
        </defs>

        <circle cx="50" cy="50" r="44" fill="#00f2fe" fillOpacity="0.1" />
        <circle cx="50" cy="50" r="42" stroke="url(#wfLogoGrad)" strokeWidth="1.5" strokeDasharray="4 2" opacity="0.6" />
        
        <ellipse cx="50" cy="50" rx="38" ry="14" stroke="url(#wfLogoGrad)" strokeWidth="2" transform="rotate(-30 50 50)" />
        <ellipse cx="50" cy="50" rx="38" ry="14" stroke="#818cf8" strokeWidth="1.5" transform="rotate(30 50 50)" opacity="0.75" />

        <path d="M50 14 L62 58 L50 50 L38 58 Z" fill="url(#wfCraftInner)" stroke="#ffffff" strokeWidth="1" transform="rotate(45 50 50)" />
        <polygon points="50,50 46,64 54,64" fill="#facc15" opacity="0.85" transform="rotate(45 50 50)" />

        <circle cx="78" cy="34" r="3.5" fill="#00f2fe" />
        <circle cx="22" cy="66" r="2.8" fill="#facc15" />
        <circle cx="50" cy="50" r="5.5" fill="#ffffff" />
      </svg>
    </div>
  );
}
