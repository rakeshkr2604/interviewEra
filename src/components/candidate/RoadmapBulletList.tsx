/** Shared bulleted sub-section used inside roadmap card expand panels (questions, topics, interviews). */
export function RoadmapBulletList({ title, items }: { title: string; items: readonly string[] }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
        {title}
      </p>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            <span
              className="mt-[0.45rem] size-1.5 shrink-0 rounded-full"
              style={{ background: 'var(--accent-primary)' }}
              aria-hidden
            />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
