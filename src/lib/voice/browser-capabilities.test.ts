import { describe, it, expect, vi, afterEach } from 'vitest';

/**
 * FM-3 (iOS Safari hybrid fallback) detection contract:
 *   - isIosSafari() identifies iOS Safari specifically (not iOS Chrome, not
 *     desktop Safari-lookalike UAs)
 *   - resolvePreferredVoiceInputMode() still starts iOS Safari on Web Speech
 *     ('voice') — the hybrid switch is a session-page runtime decision, not a
 *     mode-resolution change
 *
 * getPlatformContext() caches per module load, so every scenario re-imports
 * the module after stubbing globals.
 */

const IOS_SAFARI_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const IOS_CHROME_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0.6478.54 Mobile/15E148 Safari/604.1';
const DESKTOP_CHROME_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const ANDROID_CHROME_UA =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36';
const FIREFOX_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:127.0) Gecko/20100101 Firefox/127.0';

async function loadModule(opts: {
  ua: string;
  webSpeech?: boolean;
  getUserMedia?: boolean;
}): Promise<typeof import('./browser-capabilities')> {
  vi.resetModules();
  const win: Record<string, unknown> = {};
  if (opts.webSpeech !== false) {
    win.webkitSpeechRecognition = function stub() {};
  }
  vi.stubGlobal('window', win);
  vi.stubGlobal('document', {});
  vi.stubGlobal('navigator', {
    userAgent: opts.ua,
    ...(opts.getUserMedia === false
      ? {}
      : { mediaDevices: { getUserMedia: () => Promise.resolve() } }),
  });
  return import('./browser-capabilities');
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('isIosSafari', () => {
  it('detects iOS Safari', async () => {
    const mod = await loadModule({ ua: IOS_SAFARI_UA });
    expect(mod.isIosSafari()).toBe(true);
  });

  it('is false for Chrome on iOS (CriOS)', async () => {
    const mod = await loadModule({ ua: IOS_CHROME_UA });
    expect(mod.isIosSafari()).toBe(false);
  });

  it('is false for desktop Chrome and Android Chrome', async () => {
    expect((await loadModule({ ua: DESKTOP_CHROME_UA })).isIosSafari()).toBe(false);
    expect((await loadModule({ ua: ANDROID_CHROME_UA })).isIosSafari()).toBe(false);
  });

  it('is false during SSR (no window)', async () => {
    vi.resetModules();
    vi.stubGlobal('window', undefined);
    vi.stubGlobal('navigator', undefined);
    const mod = await import('./browser-capabilities');
    expect(mod.isIosSafari()).toBe(false);
  });
});

describe('resolvePreferredVoiceInputMode — iOS Safari hybrid contract', () => {
  it('still starts iOS Safari on Web Speech (voice) when available', async () => {
    const mod = await loadModule({ ua: IOS_SAFARI_UA, webSpeech: true });
    expect(mod.resolvePreferredVoiceInputMode()).toBe('voice');
  });

  it('falls back to deepgram on iOS Safari when Web Speech is missing', async () => {
    const mod = await loadModule({ ua: IOS_SAFARI_UA, webSpeech: false, getUserMedia: true });
    expect(mod.resolvePreferredVoiceInputMode()).toBe('deepgram');
  });

  it('falls back to text on iOS Safari when neither Web Speech nor mic exist', async () => {
    const mod = await loadModule({ ua: IOS_SAFARI_UA, webSpeech: false, getUserMedia: false });
    expect(mod.resolvePreferredVoiceInputMode()).toBe('text');
  });

  it('keeps non-iOS behavior unchanged (Chrome=voice, Firefox=deepgram)', async () => {
    expect(
      (await loadModule({ ua: DESKTOP_CHROME_UA })).resolvePreferredVoiceInputMode(),
    ).toBe('voice');
    expect(
      (await loadModule({ ua: FIREFOX_UA, webSpeech: false, getUserMedia: true }))
        .resolvePreferredVoiceInputMode(),
    ).toBe('deepgram');
  });

  it('exposes the 10s empty-transcript fallback window constant', async () => {
    const mod = await loadModule({ ua: IOS_SAFARI_UA });
    expect(mod.IOS_SAFARI_EMPTY_TRANSCRIPT_FALLBACK_MS).toBe(10_000);
  });
});
