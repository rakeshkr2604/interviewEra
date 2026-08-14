/**
 * Incremental extractor for the JSON string value of `"speech"` from a
 * partially-streamed LLM JSON object. Emits decoded plain text only — never
 * JSON punctuation. Safe when another property appears before `speech`.
 */

export type JsonSpeechExtractorStatus =
  | 'seeking'
  | 'in_speech'
  | 'speech_complete'
  | 'aborted'

type Phase =
  | 'seek_object'
  | 'seek_key'
  | 'in_key'
  | 'key_escape'
  | 'seek_colon'
  | 'seek_value'
  | 'in_speech'
  | 'escape'
  | 'unicode'
  | 'skip_string'
  | 'skip_string_escape'
  | 'skip_string_unicode'
  | 'skip_literal'
  | 'skip_number'
  | 'skip_container'
  | 'skip_container_string'
  | 'skip_container_string_escape'
  | 'skip_container_string_unicode'
  | 'done'
  | 'aborted'

export class JsonSpeechExtractor {
  private phase: Phase = 'seek_object'
  private keyBuf = ''
  private targetIsSpeech = false
  private unicodeBuf = ''
  private skipDepth = 0
  private emitted = ''
  private readonly onText: (chunk: string) => void

  constructor(onText: (chunk: string) => void) {
    this.onText = onText
  }

  get status(): JsonSpeechExtractorStatus {
    if (this.phase === 'done') return 'speech_complete'
    if (this.phase === 'aborted') return 'aborted'
    if (this.phase === 'in_speech' || this.phase === 'escape' || this.phase === 'unicode') {
      return 'in_speech'
    }
    return 'seeking'
  }

  get speechSoFar(): string {
    return this.emitted
  }

  append(chunk: string): void {
    for (let i = 0; i < chunk.length; i++) {
      this.feed(chunk[i]!)
      if (this.phase === 'done' || this.phase === 'aborted') return
    }
  }

  private emit(text: string): void {
    if (!text) return
    this.emitted += text
    this.onText(text)
  }

  private feed(ch: string): void {
    switch (this.phase) {
      case 'seek_object':
        if (ch === '{') this.phase = 'seek_key'
        else if (!/\s/.test(ch)) this.phase = 'aborted'
        break

      case 'seek_key':
        if (/\s/.test(ch) || ch === ',') break
        if (ch === '"') {
          this.keyBuf = ''
          this.phase = 'in_key'
        } else if (ch === '}') {
          // Object ended without a speech property.
          this.phase = 'aborted'
        } else {
          this.phase = 'aborted'
        }
        break

      case 'in_key':
        if (ch === '\\') {
          this.phase = 'key_escape'
        } else if (ch === '"') {
          this.targetIsSpeech = this.keyBuf === 'speech'
          this.phase = 'seek_colon'
        } else {
          this.keyBuf += ch
        }
        break

      case 'key_escape':
        // Property names almost never escape; accept next char literally.
        this.keyBuf += ch
        this.phase = 'in_key'
        break

      case 'seek_colon':
        if (/\s/.test(ch)) break
        if (ch !== ':') {
          this.phase = 'aborted'
          break
        }
        this.phase = 'seek_value'
        break

      case 'seek_value':
        if (/\s/.test(ch)) break
        if (ch === '"') {
          this.phase = this.targetIsSpeech ? 'in_speech' : 'skip_string'
        } else if (ch === '{' || ch === '[') {
          if (this.targetIsSpeech) {
            // speech must be a string
            this.phase = 'aborted'
            break
          }
          this.skipDepth = 1
          this.phase = 'skip_container'
        } else if (ch === 't' || ch === 'f' || ch === 'n') {
          if (this.targetIsSpeech) {
            this.phase = 'aborted'
            break
          }
          this.keyBuf = ch
          this.phase = 'skip_literal'
        } else if (ch === '-' || (ch >= '0' && ch <= '9')) {
          if (this.targetIsSpeech) {
            this.phase = 'aborted'
            break
          }
          this.phase = 'skip_number'
        } else {
          this.phase = 'aborted'
        }
        break

      case 'in_speech':
        if (ch === '\\') this.phase = 'escape'
        else if (ch === '"') this.phase = 'done'
        else this.emit(ch)
        break

      case 'escape':
        this.handleEscape(ch)
        break

      case 'unicode':
        this.handleUnicode(ch)
        break

      case 'skip_string':
        if (ch === '\\') this.phase = 'skip_string_escape'
        else if (ch === '"') this.phase = 'seek_key'
        break

      case 'skip_string_escape':
        if (ch === 'u') {
          this.unicodeBuf = ''
          this.phase = 'skip_string_unicode'
        } else {
          this.phase = 'skip_string'
        }
        break

      case 'skip_string_unicode':
        if (!/[0-9a-fA-F]/.test(ch)) {
          this.phase = 'aborted'
          break
        }
        this.unicodeBuf += ch
        if (this.unicodeBuf.length >= 4) {
          this.unicodeBuf = ''
          this.phase = 'skip_string'
        }
        break

      case 'skip_literal':
        if (/[a-z]/.test(ch)) {
          this.keyBuf += ch
          break
        }
        this.phase = 'seek_key'
        this.feed(ch)
        break

      case 'skip_number':
        if (/[0-9.eE+-]/.test(ch)) break
        this.phase = 'seek_key'
        this.feed(ch)
        break

      case 'skip_container':
        if (ch === '"') {
          this.phase = 'skip_container_string'
        } else if (ch === '{' || ch === '[') {
          this.skipDepth++
        } else if (ch === '}' || ch === ']') {
          this.skipDepth--
          if (this.skipDepth <= 0) this.phase = 'seek_key'
        }
        break

      case 'skip_container_string':
        if (ch === '\\') this.phase = 'skip_container_string_escape'
        else if (ch === '"') this.phase = 'skip_container'
        break

      case 'skip_container_string_escape':
        if (ch === 'u') {
          this.unicodeBuf = ''
          this.phase = 'skip_container_string_unicode'
        } else {
          this.phase = 'skip_container_string'
        }
        break

      case 'skip_container_string_unicode':
        if (!/[0-9a-fA-F]/.test(ch)) {
          this.phase = 'aborted'
          break
        }
        this.unicodeBuf += ch
        if (this.unicodeBuf.length >= 4) {
          this.unicodeBuf = ''
          this.phase = 'skip_container_string'
        }
        break

      case 'done':
      case 'aborted':
        break
    }
  }

  private handleEscape(ch: string): void {
    switch (ch) {
      case '"':
      case '\\':
      case '/':
        this.emit(ch)
        this.phase = 'in_speech'
        break
      case 'n':
        this.emit('\n')
        this.phase = 'in_speech'
        break
      case 'r':
        this.emit('\r')
        this.phase = 'in_speech'
        break
      case 't':
        this.emit('\t')
        this.phase = 'in_speech'
        break
      case 'b':
        this.emit('\b')
        this.phase = 'in_speech'
        break
      case 'f':
        this.emit('\f')
        this.phase = 'in_speech'
        break
      case 'u':
        this.unicodeBuf = ''
        this.phase = 'unicode'
        break
      default:
        this.emit(ch)
        this.phase = 'in_speech'
        break
    }
  }

  private handleUnicode(ch: string): void {
    if (!/[0-9a-fA-F]/.test(ch)) {
      this.phase = 'aborted'
      return
    }
    this.unicodeBuf += ch
    if (this.unicodeBuf.length >= 4) {
      const code = Number.parseInt(this.unicodeBuf, 16)
      this.unicodeBuf = ''
      if (Number.isFinite(code)) this.emit(String.fromCharCode(code))
      this.phase = 'in_speech'
    }
  }
}

function normalizeSpeechWs(s: string): string {
  return s.replace(/\s+/g, ' ').trim()
}

/**
 * True when `spokenPrefix` is the full canonical speech or a leading sentence
 * of it. False when sentence-0 came from a different string (pre-authority
 * LLM text vs canned complete.speech).
 */
export function speechPrefixMatchesCanonical(fullSpeech: string, spokenPrefix: string): boolean {
  const full = fullSpeech.trim()
  const spoken = spokenPrefix.trim()
  if (!spoken || !full) return false
  if (full === spoken || full.startsWith(spoken)) return true
  const fullN = normalizeSpeechWs(full)
  const spokenN = normalizeSpeechWs(spoken)
  return fullN === spokenN || fullN.startsWith(spokenN)
}

/** Strip an already-spoken first sentence so remaining TTS does not replay it. */
export function remainingSpeechAfterPrefix(fullSpeech: string, spokenPrefix: string): string {
  const full = fullSpeech.trim()
  const spoken = spokenPrefix.trim()
  if (!spoken) return full
  if (!full) return ''

  if (full.startsWith(spoken)) {
    return full.slice(spoken.length).trimStart()
  }

  const fullN = normalizeSpeechWs(full)
  const spokenN = normalizeSpeechWs(spoken)
  if (!fullN.startsWith(spokenN)) return ''

  let i = 0
  let j = 0
  while (j < spokenN.length && i < full.length) {
    if (/\s/.test(spokenN[j]!)) {
      while (j < spokenN.length && /\s/.test(spokenN[j]!)) j++
      while (i < full.length && /\s/.test(full[i]!)) i++
      continue
    }
    while (i < full.length && /\s/.test(full[i]!)) i++
    if (i >= full.length || full[i] !== spokenN[j]) return ''
    i++
    j++
  }
  while (i < full.length && /\s/.test(full[i]!)) i++
  return full.slice(i).trimStart()
}
