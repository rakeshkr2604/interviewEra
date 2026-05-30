import type { Interviewer } from '@/lib/config/interviewers';

function pickEnglishVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const indian = voices.find((voice) =>
    /en-in|india|hindi|priya|neerja|rishi/i.test(`${voice.lang} ${voice.name}`),
  );
  if (indian) return indian;
  return voices.find((voice) => voice.lang.toLowerCase().startsWith('en')) ?? voices[0] ?? null;
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
