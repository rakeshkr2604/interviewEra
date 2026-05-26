/**
 * Automatic feedback labelling.
 *
 * autoTagFeedback(liked, confusion, bugs, ctx?) → FeedbackLabel[]
 *
 * Pure and deterministic — called at submission time, persisted as TEXT[].
 * Each rule checks a keyword list (case-insensitive substring match across
 * the combined text) and an optional session-context signal.  Both paths
 * are OR-ed: matching either is enough to apply the label.
 */

import type { FeedbackSessionContext } from './collect-context';

export type FeedbackLabel =
  | 'UX'
  | 'Mobile'
  | 'Performance'
  | 'AI Accuracy'
  | 'Audio Issue'
  | 'Camera Issue'
  | 'Payment'
  | 'Login'
  | 'Credits Confusion'
  | 'Dashboard Bug'
  | 'Interview Crash';

/** Ordered list used by the filter UI and email renderer. */
export const ALL_LABELS: FeedbackLabel[] = [
  'UX',
  'Mobile',
  'Performance',
  'AI Accuracy',
  'Audio Issue',
  'Camera Issue',
  'Payment',
  'Login',
  'Credits Confusion',
  'Dashboard Bug',
  'Interview Crash',
];

interface TagRule {
  label: FeedbackLabel;
  keywords: string[];
  signal?: (ctx: FeedbackSessionContext | null) => boolean;
}

const RULES: TagRule[] = [
  {
    label: 'UX',
    keywords: [
      'confusing', 'confused', 'unclear', 'hard to use', 'not intuitive',
      'unintuitive', 'interface', 'layout', 'design', 'navigation',
      'user experience', 'hard to find', 'not obvious', 'difficult to',
      'hard to understand', 'not clear', 'weird flow', 'bad ux', 'poor ux',
      'no button', 'missing button', 'hard to navigate',
    ],
  },
  {
    label: 'Mobile',
    keywords: [
      'mobile', 'phone', 'tablet', 'responsive', 'small screen', 'touch',
      'ios', 'android', 'iphone', 'ipad', 'smartphone',
    ],
    signal: (ctx) =>
      ctx?.device_type === 'mobile' || ctx?.device_type === 'tablet',
  },
  {
    label: 'Performance',
    keywords: [
      'slow', 'lag', 'lagging', 'freeze', 'freezing', 'loading', 'buffering',
      'takes forever', 'too long', 'delayed', 'latency', 'timeout', 'hung',
      'hang', 'not fast', 'takes a while', 'taking long', 'loading spinner',
      'load time', 'page load',
    ],
  },
  {
    label: 'AI Accuracy',
    keywords: [
      'wrong answer', 'incorrect answer', 'inaccurate', 'bad question',
      'irrelevant question', 'irrelevant answer', 'wrong question',
      'wrong evaluation', 'bad evaluation', 'unfair evaluation',
      'incorrect feedback', 'wrong feedback', 'wrong response',
      "doesn't understand", 'does not understand', 'off-topic', 'off topic',
      'hallucin', 'makes no sense', 'nonsense question', 'bad ai',
      'ai error', 'model wrong', 'question unrelated', 'not relevant',
      'poor quality question', 'question quality',
    ],
  },
  {
    label: 'Audio Issue',
    keywords: [
      'audio', 'sound', 'microphone', 'voice recognition', 'hearing',
      'echo', 'silent', 'no sound', "can't speak", 'cant speak',
      'speech recognition', 'listening', 'volume', 'muted', 'mute',
      'mic not working', 'audio not working', 'mic issue', 'mic problem',
    ],
    signal: (ctx) =>
      ctx?.mic_permission_status === 'denied' ||
      ctx?.speech_recognition_supported === false ||
      ctx?.speech_recognition_enabled === false,
  },
  {
    label: 'Camera Issue',
    keywords: [
      'camera', 'webcam', 'video feed', "can't see", 'cant see',
      'black screen', 'no video', 'face detection', 'camera not working',
      'no camera',
    ],
    signal: (ctx) => ctx?.camera_permission_status === 'denied',
  },
  {
    label: 'Payment',
    keywords: [
      'payment', 'paid', 'charge', 'charged', 'billing', 'credit card',
      'subscription', 'pricing', 'invoice', 'refund', 'transaction',
      'stripe', 'purchased', 'double charge', 'overcharged', 'money',
      'billed',
    ],
  },
  {
    label: 'Login',
    keywords: [
      'login', 'log in', 'sign in', 'signin', 'sign up', 'signup',
      'password', 'authentication', 'oauth', 'session expired',
      'logged out', "can't access account", 'cant log', 'cannot log',
      'forgot password', 'reset password', 'google login', 'login failed',
      'sign in failed', 'not logged',
    ],
  },
  {
    label: 'Credits Confusion',
    keywords: [
      'credits', 'credit balance', 'tokens', 'balance deducted',
      'ran out of', 'used up', 'credit limit', 'quota', 'out of credits',
      'credit count', 'no credits', 'credits gone', 'credit not',
      'credits not', 'free credits', 'how many credits',
    ],
  },
  {
    label: 'Dashboard Bug',
    keywords: [
      'dashboard', 'interview history', 'past interview', 'results page',
      'score history', 'profile page', 'settings page', 'sidebar',
      'navigation menu', 'analytics page', 'past session', 'history page',
      'my interviews', 'interview list',
    ],
  },
  {
    label: 'Interview Crash',
    keywords: [
      'crash', 'crashed', 'crashing', 'froze', 'frozen', 'stuck',
      'stopped working', 'ended unexpectedly', 'kicked out', 'disconnected',
      'interview ended', 'session ended', 'ended early', 'abruptly ended',
      'timed out', 'interview stopped', 'interview crashed',
      'lost my interview', 'interview lost', 'lost connection',
    ],
  },
];

/**
 * Returns deduplicated labels that match this feedback.
 * Call at API submission time and persist the result as TEXT[].
 */
export function autoTagFeedback(
  likedText: string,
  confusionText: string,
  bugsText: string,
  ctx: FeedbackSessionContext | null = null,
): FeedbackLabel[] {
  const hay = `${likedText}\n${confusionText}\n${bugsText}`.toLowerCase();
  const tags: FeedbackLabel[] = [];

  for (const rule of RULES) {
    const textMatch  = rule.keywords.some((k) => hay.includes(k));
    const signalMatch = rule.signal ? rule.signal(ctx) : false;
    if (textMatch || signalMatch) tags.push(rule.label);
  }

  return tags;
}
