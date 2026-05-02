export const FILLER_WORDS = [
  'um', 'uh', 'like', 'basically', 'literally', 'actually',
  'you know', 'i mean', 'kind of', 'sort of', 'right',
  'okay so', 'so basically', 'honestly',
  'matlab', 'yaani', 'toh', 'bas', 'waise',
  'dekho', 'samjhe', 'accha so',
]

export const FILLER_THRESHOLDS = {
  safe: 3,
  warning: 6,
  severe: 9,
}

export const FILLER_MESSAGES = {
  safe: "Natural pacing — filler words within acceptable range.",
  warning: "Watch out — try to pause instead of using filler words.",
  severe: "High filler word usage detected. Practice deliberate pauses.",
}
