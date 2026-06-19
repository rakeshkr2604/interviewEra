'use client'

/**
 * Composition root for a browser voice session. Assembles the concrete
 * managers (single owners) and wires them into one VoiceSessionOrchestrator.
 *
 * This is the ONLY place that knows the concrete implementations
 * (BrowserAudioDriver, Deepgram/Browser STT transports, ElevenLabs TTS, HTTP
 * conversation). Everything downstream depends on interfaces, per Clean
 * Architecture — so this file is the seam where production wiring lives and the
 * orchestrator stays testable with fakes.
 */
import { AudioSessionManager } from '@/lib/voice/audio/audio-session-manager'
import { BrowserAudioDriver } from '@/lib/voice/audio/browser-audio-driver'
import { SttPipeline } from '@/lib/voice/stt/stt-pipeline'
import { DeepgramTransport } from '@/lib/voice/stt/deepgram-transport'
import { BrowserSttTransport } from '@/lib/voice/stt/browser-stt-transport'
import { TtsPipeline } from '@/lib/voice/tts/tts-pipeline'
import { createElevenLabsSynthesizer } from '@/lib/voice/tts/elevenlabs-synthesizer'
import {
  HttpConversationEngine,
  createHttpConversationApi,
  type StaticQuestion,
} from '@/lib/voice/conversation/http-conversation-engine'
import { VoiceSessionOrchestrator } from '@/lib/voice/orchestrator/voice-session-orchestrator'
import { VoiceEventBus } from '@/lib/voice/core/event-bus'
import type { TTSOptions } from '@/lib/voice/tts-client'
import type { AnswerStyle } from '@/lib/settings/client-preferences'

export interface CreateVoiceSessionInput {
  interviewId: string
  interviewerId: string | null
  role: string
  difficulty: string
  questions: StaticQuestion[]
  /** ElevenLabs voice + tone for the interviewer. */
  voice: TTSOptions['voice']
  tone: TTSOptions['tone']
  answerTimeoutMs?: number
  getAnswerStyle?: () => AnswerStyle | undefined
  bus?: VoiceEventBus
}

export function createVoiceSession(input: CreateVoiceSessionInput): VoiceSessionOrchestrator {
  if (input.questions.length === 0) {
    throw new Error('createVoiceSession: at least one question is required.')
  }
  const bus = input.bus ?? new VoiceEventBus()

  const audio = new AudioSessionManager({ driver: new BrowserAudioDriver(), bus })

  const stt = new SttPipeline({
    transportFactory: (kind) =>
      kind === 'browser' ? new BrowserSttTransport() : new DeepgramTransport(input.interviewId),
    bus,
  })

  const tts = new TtsPipeline({
    synthesizer: createElevenLabsSynthesizer(),
    sink: audio,
    bus,
  })

  const conversation = new HttpConversationEngine({
    interviewId: input.interviewId,
    interviewerId: input.interviewerId,
    role: input.role,
    difficulty: input.difficulty,
    questions: input.questions,
    api: createHttpConversationApi(),
    getAnswerStyle: input.getAnswerStyle,
  })

  const first = input.questions[0]

  return new VoiceSessionOrchestrator({
    interviewId: input.interviewId,
    audio,
    stt,
    tts,
    conversation,
    voiceOptions: { voice: input.voice, tone: input.tone },
    firstQuestion: { text: first.questionText, questionIndex: 0, isFollowUp: false },
    bus,
    answerTimeoutMs: input.answerTimeoutMs,
  })
}
