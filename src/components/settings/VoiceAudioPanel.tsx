'use client'

import { useCallback, useState } from 'react'
import Image from 'next/image'
import { Loader2, Mic, Volume2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { SettingsSwitch } from '@/components/settings/SettingsSwitch'
import {
  getInterviewerById,
  interviewers,
  type InterviewerId,
} from '@/lib/config/interviewers'
import { resolveVoiceForInterviewer } from '@/lib/interviewer/voice'
import {
  STORAGE_KEYS,
  readVoiceGender,
  readAiVoiceEnabled,
  readNoiseCancellationPreferred,
  readTtsRate,
  type VoiceGenderPreference,
} from '@/lib/settings/client-preferences'
import { micCaptureCoordinator } from '@/lib/voice/mic-capture-coordinator'
import { cn } from '@/lib/utils'

async function getVoicesWithRetry(): Promise<SpeechSynthesisVoice[]> {
  const voices = window.speechSynthesis.getVoices()
  if (voices.length > 0) return voices

  return new Promise((resolve) => {
    const handleVoicesChanged = () => {
      const loadedVoices = window.speechSynthesis.getVoices()
      if (loadedVoices.length > 0) {
        window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged)
        resolve(loadedVoices)
      }
    }
    window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged)
    window.setTimeout(() => {
      window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged)
      resolve(window.speechSynthesis.getVoices())
    }, 1200)
  })
}

const PREVIEW_TEXT =
  'Hi — I am your AI interviewer. I will ask you a few questions. Take your time and answer naturally.'

function genderToInterviewerId(g: VoiceGenderPreference): InterviewerId {
  return g === 'female' ? 'priya' : 'arjun'
}

export function VoiceAudioPanel() {
  const [voiceGender, setVoiceGender] = useState<VoiceGenderPreference>(() => readVoiceGender())
  const [rate, setRate] = useState(() => readTtsRate())
  const [aiVoice, setAiVoice] = useState(() => readAiVoiceEnabled())
  const [noiseCancellation, setNoiseCancellation] = useState(() => readNoiseCancellationPreferred())
  const [previewing, setPreviewing] = useState<InterviewerId | null>(null)
  const [micState, setMicState] = useState<'idle' | 'testing' | 'ok' | 'error'>('idle')
  const [savedFlash, setSavedFlash] = useState(false)

  const persistVoice = useCallback((g: VoiceGenderPreference) => {
    setVoiceGender(g)
    localStorage.setItem(STORAGE_KEYS.voiceGender, g)
    setSavedFlash(true)
    window.setTimeout(() => setSavedFlash(false), 1200)
  }, [])

  const handlePreview = async (id: InterviewerId) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    setPreviewing(id)
    const interviewer = getInterviewerById(id)
    if (!interviewer) {
      setPreviewing(null)
      return
    }
    const utterance = new SpeechSynthesisUtterance(PREVIEW_TEXT)
    utterance.rate = rate
    utterance.pitch = interviewer.gender === 'female' ? 1.1 : 0.85
    const voices = await getVoicesWithRetry()
    const voice = resolveVoiceForInterviewer(voices, interviewer)
    if (voice) utterance.voice = voice
    utterance.onend = () => setPreviewing(null)
    utterance.onerror = () => setPreviewing(null)
    window.speechSynthesis.speak(utterance)
  }

  const runMicTest = async () => {
    if (!navigator?.mediaDevices?.getUserMedia) {
      setMicState('error')
      return
    }
    setMicState('testing')
    try {
      await micCaptureCoordinator.acquire({ owner: 'settings_test' })
      micCaptureCoordinator.release('settings_test')
      setMicState('ok')
      window.setTimeout(() => setMicState('idle'), 2500)
    } catch {
      micCaptureCoordinator.release('settings_test')
      setMicState('error')
    }
  }

  return (
    <div className="space-y-5">
      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
        Choose the AI interviewer voice. Playback uses your browser&apos;s built-in voices — quality varies by device.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        {interviewers.map((iv) => {
          const g: VoiceGenderPreference = iv.gender === 'female' ? 'female' : 'male'
          const selected = genderToInterviewerId(voiceGender) === iv.id
          return (
            <div
              key={iv.id}
              className={cn(
                'relative flex gap-3 rounded-2xl border-2 p-3 text-left transition-all duration-200',
                !selected && 'border-[var(--card-border)]',
              )}
              style={
                selected
                  ? {
                      color: 'var(--text-primary)',
                      borderColor: 'var(--accent-primary)',
                      background:
                        'color-mix(in srgb, var(--accent-primary) 10%, transparent)',
                    }
                  : { color: 'var(--text-primary)' }
              }
            >
              <button
                type="button"
                aria-pressed={selected}
                aria-label={`Select ${iv.name} as interviewer voice`}
                onClick={() => persistVoice(g)}
                className={cn(
                  'flex min-w-0 flex-1 cursor-pointer gap-3 border-0 bg-transparent p-0 text-left',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/45',
                )}
              >
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-[var(--bg-secondary)]">
                  <Image
                    src={iv.avatarImage}
                    alt=""
                    width={64}
                    height={64}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{iv.name}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {iv.role}
                  </p>
                </div>
              </button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 shrink-0 self-end text-xs"
                onClick={() => void handlePreview(iv.id)}
                disabled={previewing === iv.id}
                aria-label={`Preview ${iv.name} voice`}
              >
                  {previewing === iv.id ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      Playing
                    </>
                  ) : (
                    <>
                      <Volume2 className="size-3.5" />
                      Preview
                    </>
                  )}
              </Button>
            </div>
          )
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => void runMicTest()}>
          <Mic className="size-3.5" />
          Test microphone
        </Button>
        {micState === 'testing' ? (
          <span className="self-center text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
            Listening…
          </span>
        ) : null}
        {micState === 'ok' ? (
          <span className="self-center text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            Mic access OK
          </span>
        ) : null}
        {micState === 'error' ? (
          <span className="self-center text-xs font-medium text-destructive">
            Could not access microphone
          </span>
        ) : null}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="tts-rate" className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            Speaking speed
          </Label>
          <span className="text-xs tabular-nums" style={{ color: 'var(--text-muted)' }}>
            {rate.toFixed(2)}×
          </span>
        </div>
        <input
          id="tts-rate"
          type="range"
          min={0.75}
          max={1.15}
          step={0.05}
          value={rate}
          onChange={(e) => {
            const v = Number.parseFloat(e.target.value)
            setRate(v)
            localStorage.setItem(STORAGE_KEYS.ttsRate, String(v))
            setSavedFlash(true)
            window.setTimeout(() => setSavedFlash(false), 1200)
          }}
          className="h-2 w-full cursor-pointer accent-[var(--accent-primary)]"
        />
      </div>

      <div
        className="flex items-center justify-between gap-4 rounded-xl border px-4 py-3"
        style={{ borderColor: 'var(--card-border)', background: 'var(--bg-secondary)' }}
      >
        <div>
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            AI voice during interviews
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            When off, questions advance without spoken audio (text on screen only).
          </p>
        </div>
        <SettingsSwitch
          checked={aiVoice}
          onCheckedChange={(next) => {
            setAiVoice(next)
            localStorage.setItem(STORAGE_KEYS.aiVoiceEnabled, next ? '1' : '0')
            setSavedFlash(true)
            window.setTimeout(() => setSavedFlash(false), 1200)
          }}
          aria-label="Toggle AI voice"
        />
      </div>

      <div
        className="flex items-center justify-between gap-4 rounded-xl border px-4 py-3"
        style={{ borderColor: 'var(--card-border)', background: 'var(--bg-secondary)' }}
      >
        <div>
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            Noise cancellation
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Uses browser mic processing when available; effectiveness varies by device.
          </p>
        </div>
        <SettingsSwitch
          checked={noiseCancellation}
          onCheckedChange={(next) => {
            setNoiseCancellation(next)
            localStorage.setItem(STORAGE_KEYS.noiseCancellation, next ? '1' : '0')
            setSavedFlash(true)
            window.setTimeout(() => setSavedFlash(false), 1200)
          }}
          aria-label="Toggle noise cancellation"
        />
      </div>

      {savedFlash ? (
        <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400" role="status">
          Saved
        </p>
      ) : null}
    </div>
  )
}
