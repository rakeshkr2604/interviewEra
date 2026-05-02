'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'motion/react'
import { useOnboarding } from '@/lib/onboarding/store'
import { AvatarCard } from '@/components/avatar/AvatarCard'
import { StepIndicator } from '@/components/onboarding/StepIndicator'
import {
  getInterviewerById,
  interviewers,
  type InterviewerId,
} from '@/lib/config/interviewers'
import { resolveVoiceForInterviewer } from '@/lib/interviewer/voice'

export default function AvatarSelectionPage() {
  const router = useRouter()
  const { data, setInterviewerId } = useOnboarding()
  const [previewing, setPreviewing] = useState<InterviewerId | null>(null)

  const handleSelect = (id: InterviewerId) => {
    setInterviewerId(id)
  }

  const getVoicesWithRetry = async (): Promise<SpeechSynthesisVoice[]> => {
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
      "Hi! I am your AI interviewer today. I will ask you a few questions — take your time and answer naturally."
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
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-lg"
      >
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-(--text-primary)">
            Choose Your Interviewer
          </h1>
          <p className="mt-2 text-(--text-secondary)">
            Pick who will conduct your mock interview today.
          </p>
        </div>

        {/* Fake step 4 of 4 for visual consistency */}
        <div className="mb-8">
          <StepIndicator currentStep={4} totalSteps={4} labels={['Goal', 'Details', 'Resume', 'Interviewer']} />
        </div>

        <div className="dashboard-premium-card space-y-4 p-8 sm:p-10">
          {interviewers.map(avatar => (
            <div key={avatar.id} className="space-y-2">
              <AvatarCard
                avatar={avatar}
                isSelected={data.interviewerId === avatar.id}
                onSelect={handleSelect}
              />
              <button
                onClick={() => { void handlePreviewVoice(avatar.id) }}
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

          <div className="mt-6 flex items-center justify-between pt-2">
            <button
              onClick={() => router.push('/onboarding')}
              className="text-sm text-(--text-secondary)
                         hover:text-(--text-primary) transition-colors duration-200"
            >
              ← Back
            </button>
            <button
              onClick={() => router.push('/onboarding/briefing')}
              disabled={!data.interviewerId}
              className="rounded-xl bg-(--accent-primary) px-8 py-3
                         text-sm font-semibold text-white shadow-lg
                         hover:bg-(--accent-hover) transition-colors duration-200
                         disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Continue →
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
