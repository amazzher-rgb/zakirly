import React from 'react';

interface LogoProps {
  variant?: 'full' | 'compact' | 'icon';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSlogan?: boolean;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({
  variant = 'full',
  size = 'md',
  showSlogan = true,
  className = '',
}) => {
  // Dimensions for SVG mark
  const dimensions = {
    sm: { width: 36, height: 36, textClass: 'text-sm', sloganClass: 'text-[9px]' },
    md: { width: 44, height: 44, textClass: 'text-lg', sloganClass: 'text-[10px]' },
    lg: { width: 60, height: 60, textClass: 'text-2xl', sloganClass: 'text-xs' },
    xl: { width: 90, height: 90, textClass: 'text-4xl', sloganClass: 'text-sm' },
  }[size];

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Zakirly Official 3D Vector Logo Mark */}
      <svg
        width={dimensions.width}
        height={dimensions.height}
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 drop-shadow-md transition-transform hover:scale-105 duration-200"
      >
        <defs>
          {/* Orange Ribbon Gradient */}
          <linearGradient id="orangeRibbon" x1="20" y1="20" x2="180" y2="180" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FF9D00" />
            <stop offset="50%" stopColor="#F57C00" />
            <stop offset="100%" stopColor="#E65100" />
          </linearGradient>

          {/* Blue Z Gradient */}
          <linearGradient id="blueZ" x1="60" y1="20" x2="160" y2="140" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#00B0FF" />
            <stop offset="40%" stopColor="#0080FF" />
            <stop offset="100%" stopColor="#0040B0" />
          </linearGradient>

          {/* Inner Shadow for Z */}
          <filter id="shadowZ" x="-10%" y="-10%" width="130%" height="130%">
            <feDropShadow dx="2" dy="4" stdDeviation="3" floodColor="#002868" floodOpacity="0.4" />
          </filter>

          {/* Globe Orange Gradient */}
          <linearGradient id="globeGrad" x1="30" y1="10" x2="110" y2="90" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFA726" />
            <stop offset="100%" stopColor="#FB8C00" />
          </linearGradient>
        </defs>

        {/* --- ORANGE SWOOSH & BOTTOM ARROW --- */}
        <path
          d="M 55 55 C 20 80 10 130 40 160 C 70 185 130 175 160 145 L 180 130 L 145 110 C 130 135 75 145 55 125 C 40 110 45 80 65 65 Z"
          fill="url(#orangeRibbon)"
        />
        {/* Play-style Arrow tip at bottom right */}
        <path
          d="M 145 105 L 185 130 L 140 155 L 150 130 Z"
          fill="#EF6C00"
        />

        {/* --- GLOBE ICON (Top Left) --- */}
        <g transform="translate(48, 48)">
          <circle cx="0" cy="0" r="32" stroke="url(#globeGrad)" strokeWidth="6" fill="#FFF8E1" />
          <ellipse cx="0" cy="0" rx="32" ry="14" stroke="#FB8C00" strokeWidth="3" fill="none" />
          <line x1="0" y1="-32" x2="0" y2="32" stroke="#FB8C00" strokeWidth="3" />
          <line x1="-32" y1="0" x2="32" y2="0" stroke="#FB8C00" strokeWidth="3" />
          <circle cx="-12" cy="-10" r="3" fill="#E65100" />
          <circle cx="12" cy="10" r="3" fill="#E65100" />

          {/* Blue Pointer Cursor */}
          <path
            d="M 6 4 L 20 18 L 12 18 L 16 26 L 11 28 L 7 20 L 2 23 Z"
            fill="#0091EA"
            stroke="#FFFFFF"
            strokeWidth="1.5"
          />
        </g>

        {/* --- BLUE STYLIZED Z BODY --- */}
        <path
          d="M 98 25 L 172 25 L 172 55 L 105 125 L 172 125 L 172 155 L 60 155 L 60 125 L 128 55 L 98 55 Z"
          fill="url(#blueZ)"
          filter="url(#shadowZ)"
        />

        {/* --- ICONS INSIDE THE Z --- */}
        {/* 1. Top Icon: Book with Play symbol */}
        <g transform="translate(142, 40) scale(0.65)" fill="#FFFFFF">
          <path d="M-12,-10 L12,-10 C16,-10 18,-8 18,-4 L18,10 C18,6 16,4 12,4 L-12,4 C-16,4 -18,6 -18,10 L-18,-4 C-18,-8 -16,-10 -12,-10 Z" />
          <path d="M-4,-4 L6,0 L-4,4 Z" fill="#0077C8" />
        </g>

        {/* 2. Middle Icon: Tablet with Pencil */}
        <g transform="translate(110, 88) scale(0.65)" fill="#FFFFFF">
          <rect x="-14" y="-12" width="28" height="24" rx="3" />
          <rect x="-10" y="-8" width="20" height="16" fill="#0085FF" rx="1.5" />
          <path d="M 2 -4 L 8 2 L -2 6 L -4 4 Z" fill="#FFFFFF" />
        </g>

        {/* 3. Bottom Icon: Graduation Cap */}
        <g transform="translate(85, 138) scale(0.7)" fill="#FFFFFF">
          <polygon points="0,-10 16,0 0,10 -16,0" />
          <path d="M-10,3 L-10,9 C-10,13 10,13 10,9 L10,3" stroke="#FFFFFF" strokeWidth="2" fill="none" />
          <path d="M12,1 L15,10 L13,10" stroke="#FFFFFF" strokeWidth="1.5" />
        </g>
      </svg>

      {/* Brand Text & Slogan */}
      {variant !== 'icon' && (
        <div className="flex flex-col justify-center leading-none">
          {/* Main Brand Name */}
          <div className="flex items-baseline gap-1">
            <span className={`font-black font-serif tracking-tight ${dimensions.textClass}`}>
              <span className="text-[#0074C8]">ZAKIR</span>
              <span className="text-[#E57E00]">LY</span>
            </span>
            <span className="text-[10px] font-black bg-gradient-to-r from-amber-500 to-amber-600 text-white px-1.5 py-0.5 rounded shadow-xs">
              ذاكرلي
            </span>
          </div>

          {/* Official Slogan */}
          {showSlogan && variant === 'full' && (
            <p className={`font-bold mt-1 text-slate-700 tracking-wide ${dimensions.sloganClass}`}>
              <span className="text-[#0074C8]">عِلْمٌ يَلِيق،</span>{' '}
              <span className="text-[#E57E00]">مُسْتَقْبَلٌ يُضِيء</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
};
