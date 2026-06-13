import { getPlatformContext } from '@/lib/voice/lifecycle-log'

export type InterviewInputMode = 'voice' | 'deepgram' | 'text'

export interface BrowserVoiceCapabilities {
  webSpeech: boolean
  browserTts: boolean
  deepgramMic: boolean
  platform: ReturnType<typeof getPlatformContext>['platform']
  browser: ReturnType<typeof getPlatformContext>['browser']
  pwa: boolean
  /** Best default for this device/browser combo. */
  recommendedMode: InterviewInputMode
  /** Short hint for settings / help surfaces. */
  supportSummary: string
}

function hasWebSpeechRecognition(): boolean {
  if (typeof window === 'undefined') return false
  return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window
}

function hasBrowserTts(): boolean {
  if (typeof window === 'undefined') return false
  return 'speechSynthesis' in window
}

function hasGetUserMedia(): boolean {
  if (typeof navigator === 'undefined') return false
  return Boolean(navigator.mediaDevices?.getUserMedia)
}

/**
 * Classify voice input options for the current browser + OS.
 * Used for smart fallbacks (e.g. Firefox → Deepgram) and accurate UI copy.
 */
export function getBrowserVoiceCapabilities(): BrowserVoiceCapabilities {
  const ctx = getPlatformContext()
  const webSpeech = hasWebSpeechRecognition()
  const browserTts = hasBrowserTts()
  const deepgramMic = hasGetUserMedia()

  let recommendedMode: InterviewInputMode = 'voice'
  let supportSummary =
    'Voice input works best on Chrome or Edge (desktop and Android). Safari on iPhone may need a tap to unlock audio.'

  if (!webSpeech && !deepgramMic) {
    recommendedMode = 'text'
    supportSummary =
      'This browser cannot access the microphone. Type your answers or switch to Chrome, Edge, or Safari.'
  } else if (!webSpeech && deepgramMic) {
    recommendedMode = 'deepgram'
    supportSummary =
      'Live transcription uses AI Voice mode in this browser (Firefox and some in-app browsers). Tap the mode button if needed.'
  } else if (ctx.platform === 'ios') {
    recommendedMode = 'voice'
    supportSummary =
      'On iPhone/iPad: tap Enable Audio when prompted, allow the microphone, and keep this tab in the foreground. Use Type mode if voice drops.'
  } else if (ctx.browser === 'firefox') {
    recommendedMode = deepgramMic ? 'deepgram' : 'text'
    supportSummary =
      'Firefox does not support browser speech-to-text. Use AI Voice mode or type your answer.'
  } else if (ctx.platform === 'android') {
    recommendedMode = webSpeech ? 'voice' : deepgramMic ? 'deepgram' : 'text'
    supportSummary =
      'Android Chrome supports voice answers. Close other apps using the mic if capture fails.'
  } else if (ctx.browser === 'chrome' || ctx.browser === 'edge') {
    recommendedMode = 'voice'
    supportSummary = 'Full voice mode supported. AI Voice is available as an alternative from the mode button.'
  } else if (ctx.browser === 'safari' && ctx.platform === 'desktop') {
    recommendedMode = webSpeech ? 'voice' : 'text'
    supportSummary =
      'Safari on Mac supports voice with occasional reconnects during long pauses. Type mode is always available.'
  }

  if (!browserTts && recommendedMode !== 'text') {
    supportSummary += ' Question audio may be text-only if speech synthesis is blocked.'
  }

  return {
    webSpeech,
    browserTts,
    deepgramMic,
    platform: ctx.platform,
    browser: ctx.browser,
    pwa: ctx.pwa,
    recommendedMode,
    supportSummary,
  }
}

/** User-facing message when Web Speech is unavailable (browser-accurate). */
export function getWebSpeechUnsupportedMessage(): string {
  const { browser, platform, deepgramMic } = getBrowserVoiceCapabilities()
  if (browser === 'firefox') {
    return deepgramMic
      ? 'Firefox cannot use browser speech-to-text. Switch to AI Voice mode or type your answer.'
      : 'Speech recognition is not supported in Firefox. Please type your answer.'
  }
  if (platform === 'ios') {
    return 'Voice recognition failed. Allow the microphone, tap Retry Mic, or switch to Type mode.'
  }
  return 'Speech recognition is not supported in this browser. Use Chrome, Edge, Safari, or switch to AI Voice / Type mode.'
}

/** Startup probe error — avoid falsely claiming only Chrome works on Safari iOS. */
export function getSpeechSynthesisProbeError(): string {
  const { browser, platform } = getBrowserVoiceCapabilities()
  if (platform === 'ios') {
    return 'Speech audio is not available yet. Tap Enable Audio on the question screen to continue.'
  }
  if (browser === 'firefox') {
    return 'Speech synthesis is limited in Firefox. You can still answer by voice (AI Voice) or by typing.'
  }
  return 'Speech synthesis is not supported in this browser. Try Chrome, Edge, or Safari, or use Type mode.'
}
