'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { ImageUp, Loader2, X, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { maybeCompressImage } from '@/lib/feedback/compress-image'
import {
  SCREENSHOT_BUCKET,
  SCREENSHOT_MAX_BYTES,
  isAllowedScreenshotMime,
} from '@/lib/feedback/screenshot'
import { cn } from '@/lib/utils'

type Status = 'idle' | 'working' | 'done' | 'error'

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

export function ScreenshotUploader({
  disabled,
  onUploadingChange,
  onUploaded,
  onCleared,
}: {
  disabled?: boolean
  onUploadingChange: (uploading: boolean) => void
  onUploaded: (path: string) => void
  onCleared: () => void
}) {
  const [status, setStatus] = useState<Status>('idle')
  const [dragActive, setDragActive] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [meta, setMeta] = useState<{ name: string; size: number } | null>(null)

  const inputRef = useRef<HTMLInputElement>(null)
  const previewRef = useRef<string | null>(null)

  const setPreviewUrl = useCallback((url: string | null) => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current)
    previewRef.current = url
    setPreview(url)
  }, [])

  useEffect(() => {
    return () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current)
    }
  }, [])

  const reset = useCallback(() => {
    setPreviewUrl(null)
    setMeta(null)
    setStatus('idle')
    if (inputRef.current) inputRef.current.value = ''
    onUploadingChange(false)
    onCleared()
  }, [onCleared, onUploadingChange, setPreviewUrl])

  const handleFile = useCallback(
    async (file: File) => {
      // ── Client-side validation (server re-validates via bucket config). ──
      if (!isAllowedScreenshotMime(file.type)) {
        toast.error('Unsupported file. Use a PNG, JPG, or WEBP image.')
        return
      }
      if (file.size > SCREENSHOT_MAX_BYTES) {
        toast.error('That image is over 5MB. Please attach a smaller screenshot.')
        return
      }

      setStatus('working')
      onUploadingChange(true)

      try {
        const compressed = await maybeCompressImage(file)
        // Compression could (rarely) still leave it large — guard again.
        if (compressed.size > SCREENSHOT_MAX_BYTES) {
          toast.error('That image is over 5MB even after compression.')
          reset()
          return
        }

        setPreviewUrl(URL.createObjectURL(compressed))
        setMeta({ name: compressed.name, size: compressed.size })

        // 1) Ask the server for a signed upload URL (auth-gated).
        const res = await fetch('/api/feedback/screenshot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: compressed.name, contentType: compressed.type }),
        })
        if (!res.ok) {
          const data = (await res.json().catch(() => null)) as { error?: string } | null
          throw new Error(data?.error || 'Could not start the upload.')
        }
        const { path, token } = (await res.json()) as { path: string; token: string }

        // 2) Upload bytes directly to Supabase Storage with the token.
        const supabase = createClient()
        const { error } = await supabase.storage
          .from(SCREENSHOT_BUCKET)
          .uploadToSignedUrl(path, token, compressed, { contentType: compressed.type })
        if (error) throw error

        setStatus('done')
        onUploadingChange(false)
        onUploaded(path)
      } catch (err) {
        setStatus('error')
        onUploadingChange(false)
        onCleared()
        toast.error(err instanceof Error ? err.message : 'Upload failed. Please try again.')
      }
    },
    [onCleared, onUploaded, onUploadingChange, reset, setPreviewUrl],
  )

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) void handleFile(file)
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    if (disabled || status === 'working') return
    const file = e.dataTransfer.files?.[0]
    if (file) void handleFile(file)
  }

  const openPicker = () => {
    if (disabled || status === 'working') return
    inputRef.current?.click()
  }

  const busy = status === 'working'
  const hasImage = status === 'done' && preview

  return (
    <div className="space-y-2">
      <span id="fb-screenshot-label" className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
        Attach screenshot{' '}
        <span className="font-normal" style={{ color: 'var(--text-muted)' }}>
          (optional)
        </span>
      </span>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="sr-only"
        aria-labelledby="fb-screenshot-label"
        disabled={disabled || busy}
        onChange={onPick}
      />

      {hasImage ? (
        <div
          className="flex items-center gap-3 rounded-xl border-2 p-2.5"
          style={{ borderColor: 'var(--card-border)', background: 'color-mix(in srgb, var(--card-bg) 60%, transparent)' }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview!}
            alt="Selected screenshot preview"
            className="size-14 shrink-0 rounded-lg object-cover"
            style={{ border: '1px solid var(--card-border)' }}
          />
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 truncate text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              <CheckCircle2 className="size-4 shrink-0 text-emerald-500" aria-hidden />
              <span className="truncate">{meta?.name}</span>
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {meta ? formatBytes(meta.size) : ''} · uploaded
            </p>
          </div>
          <div className="flex shrink-0 gap-1.5">
            <button
              type="button"
              onClick={openPicker}
              disabled={disabled}
              className="rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors disabled:opacity-60"
              style={{ borderColor: 'var(--card-border)', color: 'var(--text-secondary)' }}
            >
              Replace
            </button>
            <button
              type="button"
              onClick={reset}
              disabled={disabled}
              aria-label="Remove screenshot"
              className="rounded-lg border p-1.5 transition-colors disabled:opacity-60"
              style={{ borderColor: 'var(--card-border)', color: 'var(--text-muted)' }}
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={openPicker}
          onDragOver={(e) => {
            e.preventDefault()
            if (!disabled && !busy) setDragActive(true)
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={onDrop}
          disabled={disabled || busy}
          aria-describedby="fb-screenshot-hint"
          className={cn(
            'flex w-full flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/40 disabled:cursor-not-allowed disabled:opacity-70',
          )}
          style={{
            borderColor: dragActive ? 'var(--accent-primary)' : 'var(--card-border)',
            background: dragActive
              ? 'color-mix(in srgb, var(--accent-primary) 8%, transparent)'
              : 'color-mix(in srgb, var(--card-bg) 50%, transparent)',
          }}
        >
          {busy ? (
            <>
              <Loader2 className="size-6 animate-spin" style={{ color: 'var(--accent-primary)' }} aria-hidden />
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                Uploading…
              </span>
              <span className="mt-1 h-1 w-32 overflow-hidden rounded-full" style={{ background: 'var(--card-border)' }}>
                <span className="block h-full w-1/2 animate-[fb-indeterminate_1.1s_ease-in-out_infinite] rounded-full" style={{ background: 'var(--accent-primary)' }} />
              </span>
            </>
          ) : (
            <>
              <ImageUp className="size-6" style={{ color: 'var(--accent-primary)' }} aria-hidden />
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                Drag &amp; drop, or <span style={{ color: 'var(--accent-primary)' }}>browse</span>
              </span>
              <span id="fb-screenshot-hint" className="text-xs" style={{ color: 'var(--text-muted)' }}>
                PNG, JPG, or WEBP · up to 5MB
              </span>
            </>
          )}
        </button>
      )}

      <span aria-live="polite" className="sr-only">
        {status === 'working' ? 'Uploading screenshot' : status === 'done' ? 'Screenshot uploaded' : ''}
      </span>
    </div>
  )
}
