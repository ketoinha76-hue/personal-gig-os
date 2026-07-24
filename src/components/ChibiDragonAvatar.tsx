import React from "react";

interface AvatarProps {
  className?: string;
}

export default function ChibiDragonAvatar({ className = "w-10 h-10" }: AvatarProps) {
  return (
    <div className={`relative rounded-full overflow-hidden border-2 border-[var(--primary)] bg-gradient-to-b from-[#0b1329] to-[#020308] flex items-center justify-center p-0.5 shadow-[0_0_12px_var(--primary-glow)] group cursor-pointer ${className}`}>
      {/* High-tech pulsing orbit ring */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[var(--primary)] via-[var(--purple)] to-[var(--rose)] opacity-40 animate-pulse group-hover:opacity-100 transition-opacity duration-300" />
      
      {/* Inner Avatar container */}
      <div className="relative w-full h-full rounded-full bg-[#030612] flex items-center justify-center overflow-hidden">
        {/* Futuristic grid background in avatar */}
        <div className="absolute inset-0 opacity-20 bg-[linear-gradient(rgba(0,240,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,240,255,0.1)_1px,transparent_1px)] bg-[size:6px_6px]" />
        
        <svg
          viewBox="0 0 100 100"
          className="w-11/12 h-11/12 drop-shadow-[0_0_6px_rgba(0,240,255,0.6)]"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Dragon Ears / Horns (Glowing neon cyan/purple) */}
          <path
            d="M25 35C20 25 22 15 32 18C30 25 31 30 33 34Z"
            fill="url(#hornGradLeft)"
          />
          <path
            d="M75 35C80 25 78 15 68 18C70 25 69 30 67 34Z"
            fill="url(#hornGradRight)"
          />

          {/* Cute Little Wings (Peeking from behind) */}
          <path
            d="M15 50C5 45 10 32 24 40C18 45 16 48 15 50Z"
            fill="url(#wingGrad)"
            opacity="0.8"
          />
          <path
            d="M85 50C95 45 90 32 76 40C82 45 84 48 85 50Z"
            fill="url(#wingGrad)"
            opacity="0.8"
          />

          {/* Dragon Head (Main structure, chubby round cheeks) */}
          <ellipse cx="50" cy="55" rx="30" ry="24" fill="url(#dragonBodyGrad)" />
          
          {/* Chubby cheeks blush (glowing rose) */}
          <circle cx="28" cy="58" r="5" fill="#ff007f" opacity="0.4" filter="blur(1px)" />
          <circle cx="72" cy="58" r="5" fill="#ff007f" opacity="0.4" filter="blur(1px)" />

          {/* Big adorable anime eyes */}
          {/* Left Eye */}
          <circle cx="36" cy="52" r="8" fill="#030612" />
          <ellipse cx="36" cy="52" rx="7" ry="7" fill="url(#eyeGrad)" />
          {/* Eye Shine */}
          <circle cx="33" cy="48" r="2.8" fill="#ffffff" />
          <circle cx="39" cy="55" r="1.2" fill="#ffffff" />

          {/* Right Eye */}
          <circle cx="64" cy="52" r="8" fill="#030612" />
          <ellipse cx="64" cy="52" rx="7" ry="7" fill="url(#eyeGrad)" />
          {/* Eye Shine */}
          <circle cx="61" cy="48" r="2.8" fill="#ffffff" />
          <circle cx="67" cy="55" r="1.2" fill="#ffffff" />

          {/* Cute Little Cute Snout & Smiley Mouth */}
          <path
            d="M44 61C44 59 56 59 56 61C56 63 44 63 44 61Z"
            fill="#030612"
            opacity="0.15"
          />
          {/* Sweet mouth curve */}
          <path
            d="M46 64Q50 67 54 64"
            stroke="#030612"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          
          {/* Cute fangs */}
          <polygon points="45,63 47,63 46,65" fill="#ffffff" />
          <polygon points="53,63 55,63 54,65" fill="#ffffff" />

          {/* Little Head Scales / Details */}
          <path d="M48 35 L52 35 L50 31 Z" fill="#00f0ff" />
          <path d="M44 38 L47 38 L45.5 35 Z" fill="#bd00ff" />
          <path d="M53 38 L56 38 L54.5 35 Z" fill="#bd00ff" />

          {/* Definitions for gorgeous sci-fi neon gradients */}
          <defs>
            <linearGradient id="dragonBodyGrad" x1="50" y1="31" x2="50" y2="79" gradientUnits="userSpaceOnUse">
              <stop stopColor="#00f0ff" />
              <stop offset="0.5" stopColor="#0066ff" />
              <stop offset="1" stopColor="#1e005e" />
            </linearGradient>
            <linearGradient id="hornGradLeft" x1="25" y1="15" x2="33" y2="34" gradientUnits="userSpaceOnUse">
              <stop stopColor="#ff007f" />
              <stop offset="1" stopColor="#bd00ff" />
            </linearGradient>
            <linearGradient id="hornGradRight" x1="75" y1="15" x2="67" y2="34" gradientUnits="userSpaceOnUse">
              <stop stopColor="#ff007f" />
              <stop offset="1" stopColor="#bd00ff" />
            </linearGradient>
            <linearGradient id="wingGrad" x1="15" y1="32" x2="24" y2="50" gradientUnits="userSpaceOnUse">
              <stop stopColor="#00f0ff" />
              <stop offset="1" stopColor="#bd00ff" />
            </linearGradient>
            <linearGradient id="eyeGrad" x1="36" y1="45" x2="36" y2="59" gradientUnits="userSpaceOnUse">
              <stop stopColor="#00f0ff" />
              <stop offset="0.6" stopColor="#0044cc" />
              <stop offset="1" stopColor="#020308" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
}
