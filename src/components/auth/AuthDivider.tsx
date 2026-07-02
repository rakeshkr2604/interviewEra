export function AuthDivider() {
  const cardInnerBg = 'color-mix(in srgb, var(--card-bg) 94%, transparent)';

  return (
    <div className="relative">
      <div className="absolute inset-0 flex items-center" aria-hidden>
        <span className="w-full border-t-2" style={{ borderColor: 'var(--card-border)' }} />
      </div>
      <div className="relative flex justify-center text-[10px] font-bold uppercase tracking-[0.16em]">
        <span className="px-3 py-0.5" style={{ background: cardInnerBg, color: 'var(--text-muted)' }}>
          or continue with email
        </span>
      </div>
    </div>
  );
}
