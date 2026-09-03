'use client'

import dynamic from 'next/dynamic'

const CoachClient = dynamic(() => import('./CoachClient'), {
  ssr: false,
  loading: () => (
    <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg,var(--card))] px-6 py-16 text-center shadow-sm">
      <p className="text-sm text-muted-foreground">Loading AI Interview Coach…</p>
    </div>
  ),
})

export default function CoachPageClient() {
  return <CoachClient />
}
