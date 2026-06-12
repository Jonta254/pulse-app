// VeRdex brand mark — twin blades V (violet + gold), teal candlesticks,
// neon ring, base ripple. Single source of truth for the in-app logo.

export function VerdexMark({ size = 44 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" aria-label="VeRdex">
      <defs>
        <linearGradient id="vm-bl" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#a78bfa" /><stop offset="45%" stopColor="#7c3aed" /><stop offset="100%" stopColor="#3b1a8c" />
        </linearGradient>
        <linearGradient id="vm-br" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fde68a" /><stop offset="45%" stopColor="#f59e0b" /><stop offset="100%" stopColor="#8a4d04" />
        </linearGradient>
        <linearGradient id="vm-c" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#0d9488" /><stop offset="100%" stopColor="#5eead4" />
        </linearGradient>
        <linearGradient id="vm-r" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#8b5cf6" /><stop offset="100%" stopColor="#2dd4bf" />
        </linearGradient>
      </defs>
      <circle cx="100" cy="84" r="60" fill="none" stroke="url(#vm-r)" strokeWidth="3" opacity="0.8" />
      <g>
        <rect x="74" y="96" width="11" height="26" rx="2" fill="url(#vm-c)" /><rect x="78.5" y="88" width="2.5" height="9" fill="#5eead4" />
        <rect x="92" y="80" width="11" height="42" rx="2" fill="url(#vm-c)" /><rect x="96.5" y="70" width="2.5" height="11" fill="#5eead4" />
        <rect x="110" y="62" width="11" height="60" rx="2" fill="url(#vm-c)" /><rect x="114.5" y="50" width="2.5" height="13" fill="#5eead4" />
        <rect x="128" y="44" width="11" height="78" rx="2" fill="url(#vm-c)" /><rect x="132.5" y="31" width="2.5" height="14" fill="#5eead4" />
      </g>
      <polygon points="22,34 56,62 104,170 64,116" fill="url(#vm-bl)" />
      <polygon points="22,34 56,62 82,120 46,82" fill="#c4b5fd" opacity="0.35" />
      <polygon points="178,34 144,62 96,170 136,116" fill="url(#vm-br)" />
      <polygon points="178,34 144,62 118,120 154,82" fill="#fef3c7" opacity="0.4" />
      <ellipse cx="100" cy="178" rx="62" ry="13" fill="none" stroke="#8b5cf6" strokeWidth="2.4" opacity="0.55" />
      <ellipse cx="100" cy="178" rx="40" ry="8" fill="none" stroke="#2dd4bf" strokeWidth="2" opacity="0.7" />
      <path d="M84,178 L97,156 L100,148 L103,156 L116,178" fill="none" stroke="#a78bfa" strokeWidth="3" strokeLinejoin="round" opacity="0.9" />
    </svg>
  );
}
