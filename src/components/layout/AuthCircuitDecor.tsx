/**
 * Decorative circuit traces that fill the empty area around auth cards.
 * Purely presentational — never announced, never interactive.
 */

const TRACES = [
  'M4 40H44V12H96V4',
  'M4 84H28V128H84V96H132H188',
  'M4 168H60V140H120V172H188',
  'M44 40V68',
  'M120 140V112H160V72',
] as const;

const NODES = [
  [44, 40],
  [96, 12],
  [28, 84],
  [84, 96],
  [132, 96],
  [60, 168],
  [120, 140],
  [160, 72],
  [188, 172],
] as const;

function CircuitPanel({ className, flip = false }: { className: string; flip?: boolean }) {
  return (
    <svg
      viewBox="0 0 192 192"
      fill="none"
      className={className}
      style={flip ? { transform: 'scaleX(-1)' } : undefined}
      aria-hidden
      focusable="false"
    >
      {TRACES.map((d) => (
        <path key={d} d={d} stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
      ))}
      {NODES.map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="2.4" fill="currentColor" />
      ))}
    </svg>
  );
}

export function AuthCircuitDecor() {
  return (
    <div
      className="pointer-events-none absolute inset-0 hidden overflow-hidden md:block"
      style={{ color: 'color-mix(in srgb, var(--accent-primary) 42%, transparent)' }}
      aria-hidden
    >
      <CircuitPanel className="absolute -left-6 bottom-8 w-[min(20rem,26vw)] opacity-[0.28] lg:bottom-14" />
      <CircuitPanel
        className="absolute -right-6 bottom-8 w-[min(20rem,26vw)] opacity-[0.28] lg:bottom-14"
        flip
      />
      <CircuitPanel className="absolute -top-10 right-[12%] w-[min(13rem,18vw)] opacity-[0.16]" flip />

      <div
        className="absolute bottom-[-14%] left-1/2 h-[min(20rem,34vw)] w-[min(46rem,80vw)] -translate-x-1/2 rounded-[50%] blur-[110px]"
        style={{ background: 'color-mix(in srgb, var(--accent-primary) 16%, transparent)' }}
      />
    </div>
  );
}
