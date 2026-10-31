export function DashboardTargetIllustration() {
  return (
    <svg
      viewBox="0 0 260 200"
      className="h-full w-full"
      aria-hidden
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <radialGradient id="dti-outer" cx="38%" cy="32%" r="68%">
          <stop offset="0%" stopColor="#7b6de8" />
          <stop offset="100%" stopColor="#4c3bac" />
        </radialGradient>
        <radialGradient id="dti-mid" cx="38%" cy="32%" r="68%">
          <stop offset="0%" stopColor="#8a7ae8" />
          <stop offset="100%" stopColor="#5e4dc0" />
        </radialGradient>
      </defs>

      {/* ── Bullseye ──────────────────────────────────── */}
      <circle cx="128" cy="97" r="48" fill="url(#dti-outer)" />
      <circle cx="128" cy="97" r="37" fill="#eeebff" />
      <circle cx="128" cy="97" r="27" fill="url(#dti-mid)" />
      <circle cx="128" cy="97" r="17" fill="#eeebff" />
      <circle cx="128" cy="97" r="7.5" fill="#4c3bac" />
      <circle cx="128" cy="97" r="2.5" fill="white" />
      <ellipse cx="115" cy="82" rx="9" ry="5" fill="white" opacity="0.18" transform="rotate(-30 115 82)" />

      {/* ── Dart ──────────────────────────────────────── */}
      <line x1="200" y1="40" x2="131" y2="94" stroke="#2e2b5f" strokeWidth="4.5" strokeLinecap="round" />
      {/* arrowhead */}
      <path d="M131,94 L141,79 L135,96 L148,90Z" fill="#2e2b5f" />
      {/* fletching */}
      <path d="M200,40 L211,28 L207,41 L215,48 L200,40Z" fill="#8880c4" />
      <path d="M200,40 L213,32 L207,42 L213,51 L200,40Z" fill="#6c5ce7" opacity="0.7" />

      {/* ── Dashed curved arrows ───────────────────────── */}
      {/* Track Progress → Stay Consistent (left arc, going down) */}
      <path d="M46,61 C22,90 22,118 46,147" stroke="#a09ad4" strokeWidth="1.8" strokeDasharray="4,3.5" fill="none" />
      <polygon points="46,147 38,138 50,139" fill="#a09ad4" />

      {/* Stay Consistent → Achieve Your Goals (bottom arc, going right) */}
      <path d="M96,171 C120,191 158,191 186,170" stroke="#a09ad4" strokeWidth="1.8" strokeDasharray="4,3.5" fill="none" />
      <polygon points="186,170 184,159 192,166" fill="#a09ad4" />

      {/* ── Card: Track Progress (top-left) ───────────── */}
      {/* shadow */}
      <rect x="6" y="13" width="90" height="50" rx="11" fill="black" fillOpacity="0.07" />
      {/* card */}
      <rect x="5" y="11" width="90" height="50" rx="11" fill="white" />
      {/* bar-chart icon */}
      <rect x="16" y="24" width="7" height="17" rx="1.5" fill="#6c5ce7" />
      <rect x="27" y="20" width="7" height="21" rx="1.5" fill="#6c5ce7" />
      <rect x="38" y="28" width="7" height="13" rx="1.5" fill="#6c5ce7" />
      {/* text */}
      <text x="52" y="32" fontSize="10" fontWeight="700" fill="#1a1a2e" fontFamily="system-ui,-apple-system,sans-serif">Track</text>
      <text x="52" y="46" fontSize="8.5" fill="#6b7280" fontFamily="system-ui,-apple-system,sans-serif">Progress</text>

      {/* ── Card: Stay Consistent (bottom-left) ───────── */}
      <rect x="5" y="145" width="92" height="50" rx="11" fill="black" fillOpacity="0.07" />
      <rect x="4" y="143" width="92" height="50" rx="11" fill="white" />
      {/* checklist icon */}
      <rect x="13" y="155" width="14" height="14" rx="3" fill="#ebe8fa" />
      <line x1="16" y1="160" x2="25" y2="160" stroke="#6c5ce7" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="16" y1="164" x2="25" y2="164" stroke="#6c5ce7" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="16" y1="168" x2="21" y2="168" stroke="#6c5ce7" strokeWidth="1.8" strokeLinecap="round" />
      {/* text */}
      <text x="33" y="163" fontSize="10" fontWeight="700" fill="#1a1a2e" fontFamily="system-ui,-apple-system,sans-serif">Stay</text>
      <text x="33" y="177" fontSize="8.5" fill="#6b7280" fontFamily="system-ui,-apple-system,sans-serif">Consistent</text>

      {/* ── Card: Achieve Your Goals (bottom-right) ───── */}
      <rect x="164" y="138" width="95" height="50" rx="11" fill="black" fillOpacity="0.07" />
      <rect x="163" y="136" width="95" height="50" rx="11" fill="white" />
      {/* trophy cup body */}
      <path d="M172,147 L172,158 C172,163.5 175.8,167.5 180.5,168 L187.5,168 C192.2,167.5 196,163.5 196,158 L196,147 Z" fill="#f5c842" />
      {/* handles */}
      <path d="M172,151 C168,151 166,154 166,157 C166,160 168,162 172,162" stroke="#dba020" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <path d="M196,151 C200,151 202,154 202,157 C202,160 200,162 196,162" stroke="#dba020" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      {/* stem + base */}
      <rect x="181" y="168" width="6" height="5" rx="1" fill="#f5c842" />
      <rect x="177" y="173" width="14" height="3" rx="1.5" fill="#f5c842" />
      {/* shine line */}
      <line x1="178" y1="150" x2="178" y2="160" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
      {/* text */}
      <text x="204" y="154" fontSize="10" fontWeight="700" fill="#1a1a2e" fontFamily="system-ui,-apple-system,sans-serif">Achieve</text>
      <text x="204" y="168" fontSize="8.5" fill="#6b7280" fontFamily="system-ui,-apple-system,sans-serif">Your Goals</text>

      {/* ── Sparkles ──────────────────────────────────── */}
      {/* Large purple — far left-center */}
      <path d="M1,98 L3.8,105 L1,112 L-1.8,105Z M-6,105 L1,102 L8,105 L1,108Z" fill="#6c5ce7" opacity="0.75" />

      {/* Two small purple — upper-right */}
      <path d="M243,18 L244.4,22.5 L243,27 L241.6,22.5Z M239,22.5 L243,20.8 L247,22.5 L243,24.2Z" fill="#6c5ce7" opacity="0.65" />
      <path d="M254,35 L255.1,38 L254,41 L252.9,38Z M251.5,38 L254,37 L256.5,38 L254,39Z" fill="#6c5ce7" opacity="0.5" />

      {/* Yellow sparkle — mid-right */}
      <path d="M248,87 L251.2,94.5 L248,102 L244.8,94.5Z M241,94.5 L248,91.5 L255,94.5 L248,97.5Z" fill="#f5c842" opacity="0.9" />
    </svg>
  )
}
