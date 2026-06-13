'use client'

import { useEffect, useState, type ReactElement } from 'react'
import {
  getSttInputDebugState,
  isSttInputDebugEnabled,
  STT_INPUT_RMS_SPEECH_THRESHOLD,
  subscribeSttInputDebug,
  type SttInputVerdict,
} from '@/lib/voice/stt-input-debug'

function verdictColor(verdict: SttInputVerdict): string {
  switch (verdict) {
    case 'speech_pipeline_ok':
      return 'var(--ie-success, #16a34a)'
    case 'mic_silent':
      return 'var(--ie-danger, #dc2626)'
    case 'web_speech_engine':
      return 'var(--ie-warning, #d97706)'
    case 'mic_active_awaiting_vad':
    case 'collecting':
      return 'var(--ie-muted, #64748b)'
    default:
      return 'var(--ie-muted, #64748b)'
  }
}

/** Temporary Web Speech input-path debug overlay (dev / STT_INPUT_DEBUG=1). */
export function SttInputDebugPanel(): ReactElement | null {
  const [enabled] = useState(() => isSttInputDebugEnabled())
  const [snap, setSnap] = useState(getSttInputDebugState)

  useEffect(() => {
    if (!enabled) return
    return subscribeSttInputDebug(() => setSnap(getSttInputDebugState()))
  }, [enabled])

  if (!enabled) return null

  const meterPct = Math.min(100, Math.round(snap.rms * 400))
  const peakPct = Math.min(100, Math.round(snap.peak * 400))

  return (
    <div
      aria-label="STT input debug panel"
      style={{
        position: 'fixed',
        bottom: 12,
        right: 12,
        zIndex: 9999,
        width: 320,
        padding: 12,
        borderRadius: 8,
        border: '1px solid rgba(148,163,184,0.4)',
        background: 'rgba(15,23,42,0.92)',
        color: '#e2e8f0',
        fontFamily: 'ui-monospace, monospace',
        fontSize: 11,
        lineHeight: 1.45,
        pointerEvents: 'none',
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 8 }}>STT Input Debug</div>

      <div style={{ marginBottom: 6 }}>
        RMS {snap.rms.toFixed(4)} · Peak {snap.peak.toFixed(4)}
        <span style={{ opacity: 0.7 }}> (thr {STT_INPUT_RMS_SPEECH_THRESHOLD})</span>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ opacity: 0.7, marginBottom: 2 }}>RMS</div>
          <div
            style={{
              height: 8,
              borderRadius: 4,
              background: 'rgba(51,65,85,0.8)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${meterPct}%`,
                background: snap.rms >= STT_INPUT_RMS_SPEECH_THRESHOLD ? '#22c55e' : '#64748b',
                transition: 'width 80ms linear',
              }}
            />
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ opacity: 0.7, marginBottom: 2 }}>Peak</div>
          <div
            style={{
              height: 8,
              borderRadius: 4,
              background: 'rgba(51,65,85,0.8)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${peakPct}%`,
                background: snap.peak >= STT_INPUT_RMS_SPEECH_THRESHOLD * 2 ? '#f59e0b' : '#64748b',
                transition: 'width 80ms linear',
              }}
            />
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 8, color: verdictColor(snap.verdict) }}>
        {snap.verdict}: {snap.verdictDetail}
      </div>

      <div style={{ opacity: 0.85, marginBottom: 6 }}>
        gen {snap.gen} · meter {snap.meterActive ? 'on' : 'off'}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, marginBottom: 8 }}>
        {(Object.entries(snap.flags) as Array<[string, boolean]>).map(([k, v]) => (
          <span key={k} style={{ color: v ? '#4ade80' : '#94a3b8' }}>
            {v ? '✓' : '·'} {k}
          </span>
        ))}
      </div>

      {snap.trackSnapshot ? (
        <div style={{ opacity: 0.8, fontSize: 10, wordBreak: 'break-all' }}>
          {snap.trackSnapshot.label} · {snap.trackSnapshot.readyState}
          {snap.trackSnapshot.muted ? ' · muted' : ''}
        </div>
      ) : null}
    </div>
  )
}
