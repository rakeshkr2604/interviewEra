import type { Interviewer } from '@/lib/config/interviewers';
import { resolveSttLocale } from '@/lib/voice/speech-locale';

/** Prefer calm, professional en-IN / Indian English voices on mobile browsers. */
const SOFT_VOICE_HINT =
  /neerja|priya|rishi|google uk english female|microsoft zira|microsoft heera|samantha|aria|female|woman/i

const US_VOICE_HINT =
  /samantha|zira|google us english|microsoft aria|microsoft jenny|female|woman/i

function pickEnglishVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const locale = resolveSttLocale()
  if (locale === 'en-US') {
    const us = voices.find((voice) =>
      /en-us|united states|samantha|zira|jenny|aria/i.test(`${voice.lang} ${voice.name}`),
    )
    if (us) return us
    const softUs = voices.find((voice) => US_VOICE_HINT.test(voice.name))
    if (softUs) return softUs
  }
  const softIndian = voices.find((voice) =>
    /en-in|india|neerja|priya|rishi|heera/i.test(`${voice.lang} ${voice.name}`),
  )
  if (softIndian) return softIndian
  const soft = voices.find((voice) => SOFT_VOICE_HINT.test(voice.name))
  if (soft) return soft
  return voices.find((voice) => voice.lang.toLowerCase().startsWith('en')) ?? voices[0] ?? null
}

export function resolveVoiceForInterviewer(
  voices: SpeechSynthesisVoice[],
  interviewer: Interviewer
): SpeechSynthesisVoice | null {
  const englishVoices = voices.filter((voice) => voice.lang.toLowerCase().startsWith('en'));
  const candidateVoices = englishVoices.length > 0 ? englishVoices : voices;

  if (interviewer.voiceId === 'female_voice_id') {
    return (
      candidateVoices.find((voice) => /female|woman|samantha|zira|aria/i.test(voice.name)) ??
      candidateVoices.find((voice) => !/male|man|david|mark/i.test(voice.name)) ??
      pickEnglishVoice(candidateVoices)
    );
  }

  return (
    candidateVoices.find((voice) => /male|man|david|mark|guy/i.test(voice.name)) ??
    pickEnglishVoice(candidateVoices)
  );
}
