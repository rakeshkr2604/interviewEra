'use client'

import { useState } from 'react'
import { AvatarCard } from '@/components/avatar/AvatarCard'
import {
  getInterviewerById,
  interviewers,
  type InterviewerId,
} from '@/lib/config/interviewers'
import { resolveVoiceForInterviewer } from '@/lib/interviewer/voice'

interface InterviewerPickerProps {
  selectedId: InterviewerId | null
  onSelect: (id: InterviewerId) => void
}

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

export function InterviewerPicker({ selectedId, onSelect }: InterviewerPickerProps) {
  const [previewing, setPreviewing] = useState<InterviewerId | null>(null)

  const handlePreviewVoice = async (interviewerId: InterviewerId) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    setPreviewing(interviewerId)
    const interviewer = getInterviewerById(interviewerId)
    if (!interviewer) {
      setPreviewing(null)
      return
    }
    const utterance = new SpeechSynthesisUtterance(
      'Hi! I am your AI interviewer today. I will ask you a few questions — take your time and answer naturally.'
    )
    utterance.rate = 0.9
    utterance.pitch = interviewer.gender === 'female' ? 1.1 : 0.85
    const voices = await getVoicesWithRetry()
    const voice = resolveVoiceForInterviewer(voices, interviewer)
    if (voice) utterance.voice = voice
    utterance.onend = () => setPreviewing(null)
    utterance.onerror = () => setPreviewing(null)
    window.speechSynthesis.speak(utterance)
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium text-(--text-secondary)">Interviewer</p>
        <p className="mt-0.5 text-xs text-(--text-muted)">
          Pick who leads your session — you can preview their voice.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {interviewers.map((avatar) => (
          <div key={avatar.id} className="space-y-2">
            <AvatarCard
              avatar={avatar}
              isSelected={selectedId === avatar.id}
              onSelect={onSelect}
            />
            <button
              type="button"
              onClick={() => {
                void handlePreviewVoice(avatar.id)
              }}
              disabled={previewing === avatar.id}
              className="w-full rounded-xl border border-(--card-border)
                         bg-(--bg-secondary) py-2 text-xs font-medium
                         text-(--text-secondary) hover:text-(--text-primary)
                         transition-colors duration-200 disabled:opacity-50"
            >
              {previewing === avatar.id ? '🔊 Playing preview...' : '▶ Preview voice'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
