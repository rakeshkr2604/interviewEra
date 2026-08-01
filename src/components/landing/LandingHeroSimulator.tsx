'use client';

import { useEffect, useRef } from 'react';
import './LandingHeroSimulator.css';
import { LandingHeroSimulatorPoster } from '@/components/landing/LandingHeroSimulatorPoster';

/**
 * Animated hero interview simulator (React port of the handoff STANDALONE-DEMO).
 *
 * - Server-rendered static markup (initial DOM matches SSR → no hydration mismatch).
 * - Animation engine runs only in useEffect (post-hydration), with full teardown of
 *   every timeout / rAF / interval on unmount → no leaks, no orphan loops.
 * - prefers-reduced-motion → renders the final scored state once, no loop, no video.
 * - Video is preload="none" and only plays while in view (IntersectionObserver),
 *   so it never competes with hero LCP and pauses when scrolled away.
 * - Decorative: host carries an aria-label; inner DOM is aria-hidden and the fake
 *   controls are removed from the tab order.
 * - Loaded via next/dynamic from LandingHeroSimulatorIsland (poster shell first).
 */

type BarColor = '' | 'orange' | 'red';

type Turn = {
  topic: string;
  question: string;
  answer: string;
  followup: string;
  answer2: string;
  scores: { clarity: number; content: number; structure: number; specificity: number; relevance: number };
  barColors: { clarity: BarColor; content: BarColor; structure: BarColor; specificity: BarColor; relevance: BarColor };
  total: number;
};

// Source of truth — copied verbatim from STANDALONE-DEMO.html (do NOT shorten / rename).
const TURNS: Turn[] = [
  {
    topic: 'REST API · Backend systems',
    question:
      'Can you explain how you implemented the REST API in your InterviewIQ project? What HTTP methods did you use, and how did you handle data validation?',
    answer:
      'I used Express — GET, POST, PUT, DELETE. For validation I put Joi as middleware on the request body, so it ran before the controller.',
    followup:
      '"Joi runs before the controller — but what happens if the same payload reaches a different endpoint that does not run Joi? How is validation enforced at the data layer?"',
    answer2:
      "Yeah, fair point. We also had DB constraints — NOT NULL, unique indexes — and a check in the service layer before the write. So Joi wasn't the only thing.",
    scores: { clarity: 7.2, content: 8.1, structure: 6.5, specificity: 6.8, relevance: 7.9 },
    barColors: { clarity: '', content: '', structure: 'orange', specificity: 'orange', relevance: '' },
    total: 7.3,
  },
  {
    topic: 'Caching · System design',
    question:
      'You mentioned caching the user feed for 5 minutes on your resume. What was the cache invalidation strategy when a user posts something new?',
    answer:
      "We set a 5-minute TTL, and on a write we'd DEL the feed key so the next read rebuilt it from Postgres.",
    followup:
      '"5 minutes is a TTL — not invalidation. If a user posts and refreshes 4 seconds later, what do they actually see?"',
    answer2:
      "Hmm, yeah — honestly that's a gap. For those few seconds they'd see the stale feed. We didn't do write-through, so we'd probably push the update or merge it on the client.",
    scores: { clarity: 6.4, content: 7.0, structure: 5.2, specificity: 5.6, relevance: 7.5 },
    barColors: { clarity: '', content: '', structure: 'red', specificity: 'orange', relevance: '' },
    total: 6.3,
  },
  {
    topic: 'Behavioural · Disagreement',
    question:
      'Tell me about a time a teammate disagreed with a technical decision you made. What did you actually do?',
    answer:
      'Last internship I wanted Postgres, my teammate wanted Mongo. We sat down, listed what we actually needed, and went with Postgres because we needed joins.',
    followup:
      '"You said \'we needed joins\' — but joins exist in both. Was that the actual reason, or your teammate\'s framing? Where did you give ground?"',
    answer2:
      'Honestly, the joins line was the easy answer. Underneath it was schema — I wanted it strict, they liked flexibility. They gave ground on schema, I let them own the data layer.',
    scores: { clarity: 8.0, content: 6.3, structure: 7.4, specificity: 7.8, relevance: 8.4 },
    barColors: { clarity: '', content: 'orange', structure: '', specificity: '', relevance: '' },
    total: 7.6,
  },
];

const RING_CIRC = 263.894; // 2πr, r = 42
const QUESTION_SECONDS = 90;
const SCORE_KEYS = ['clarity', 'content', 'structure', 'specificity', 'relevance'] as const;
// waveform bar animation-delays (symmetric ripple from the centre)
const WAVE = Array.from({ length: 16 }, (_, i) => `${(Math.abs(i - 7.5) * 0.05).toFixed(2)}s`);

export default function LandingHeroSimulator() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const q = <T extends Element = HTMLElement>(sel: string) => root.querySelector(sel) as T | null;
    const fmtTime = (s: number) => {
      const m = Math.floor(s / 60).toString().padStart(2, '0');
      const sec = Math.floor(s % 60).toString().padStart(2, '0');
      return `${m}:${sec}`;
    };

    // ---- element refs (scoped to this card) ----
    const chip = q('.sim-chip');
    const tileProgress = q('.sim-tile-progress');
    const tileBars = q('.sim-tile-bars');
    const videoTile = q('.sim-video-tile');
    const stateEl = q('[data-sim="state"]');
    const listenOverlay = q('.sim-listen-overlay');
    const ringFg = q<SVGCircleElement>('[data-sim="ringFg"]');
    const ringTimer = q('[data-sim="ringTimer"]');
    const qIndicator = q('[data-sim="qIndicator"]');
    const qTimer = q('[data-sim="qTimer"]');
    const qBlockTimer = q('[data-sim="qBlockTimer"]');
    const blockA = q('.block.a');
    const blockFu = q('.block.fu');
    const blockA2 = q('.block.a2');
    const blockFb = q('.block.fb');
    const qBody = q('[data-sim="qBody"]');
    const aBody = q('[data-sim="aBody"]');
    const fuBody = q('[data-sim="fuBody"]');
    const a2Body = q('[data-sim="a2Body"]');
    const aLabel = q('[data-sim="aLabel"]');
    const fbTotal = q('[data-sim="fbTotal"]');
    const micEl = q('.sim-mic');
    const footStatus = q('[data-sim="footStatus"]');
    const nextBtn = q('.sim-next-btn');
    const nextBtnLabel = q('[data-sim="nextLabel"]');
    const simCursor = q<SVGElement>('.sim-cursor');
    const sim = q('.sim');
    const conv = q('.sim-conv');
    const video = q<HTMLVideoElement>('.sim-video-tile video');

    // keep the active block in view inside the fixed-height transcript (no page reflow)
    // Offset-based (no getBoundingClientRect) so it doesn't force a full sync layout
    // on every call. conv is position:relative so block offsetTop is relative to it.
    const pin = (el: Element | null) => {
      if (!conv || !el) return;
      const node = el as HTMLElement;
      const target = node.offsetTop + node.offsetHeight - conv.clientHeight + 14;
      if (target > conv.scrollTop) conv.scrollTop = target;
    };

    const progressFill = q<HTMLElement>('[data-sim="progressFill"]');
    const setProgress = (n: number) => {
      if (tileProgress) tileProgress.textContent = n + '%';
      if (progressFill) progressFill.style.width = n + '%';
    };

    const fbFill = (k: string) => q<HTMLElement>(`.fb-bar-fill[data-key="${k}"]`);
    const fbVal = (k: string) => q<HTMLElement>(`.fb-bar-val[data-key="${k}"]`);

    // ---- teardown trackers ----
    let cancelled = false;
    const timeouts = new Set<number>();
    const rafs = new Set<number>();
    const pendingResolvers = new Set<() => void>();
    let interval: number | null = null;
    let io: IntersectionObserver | null = null;

    const sleep = (ms: number) =>
      new Promise<void>((res) => {
        const done = () => {
          pendingResolvers.delete(done);
          res();
        };
        const id = window.setTimeout(done, ms);
        timeouts.add(id);
        pendingResolvers.add(done);
      });
    const raf = (cb: FrameRequestCallback) => {
      const id = window.requestAnimationFrame((t) => {
        rafs.delete(id);
        cb(t);
      });
      rafs.add(id);
    };

    // slight humanising jitter so streamed text isn't metronomic
    const jitter = (base: number) => base * (0.8 + Math.random() * 0.4);

    // ---- reduced motion: paint final state once and stop ----
    const prefersReduced =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced) {
      const t = TURNS[0];
      if (qBody) qBody.textContent = t.question;
      if (aBody) aBody.textContent = t.answer;
      if (fuBody) fuBody.textContent = t.followup;
      if (a2Body) a2Body.textContent = t.answer2;
      [blockA, blockFu, blockA2, blockFb].forEach((b) => b?.classList.add('show'));
      SCORE_KEYS.forEach((k) => {
        const fill = fbFill(k);
        const val = fbVal(k);
        if (fill) {
          fill.style.width = t.scores[k] * 10 + '%';
          if (t.barColors[k]) fill.classList.add(t.barColors[k]);
        }
        if (val) val.textContent = t.scores[k].toFixed(1);
      });
      if (fbTotal) fbTotal.innerHTML = t.total.toFixed(1) + '<small>/10</small>';
      if (footStatus) footStatus.textContent = 'Question scored · move to next';
      setProgress(Math.round(t.total * 10));
      if (qIndicator) qIndicator.textContent = '1 / 4';
      if (qTimer) qTimer.textContent = '01:12';
      if (ringTimer) ringTimer.innerHTML = '<span class="num">72</span><span class="u">Seconds</span>';
      ringFg?.setAttribute('stroke-dashoffset', String(RING_CIRC * 0.2));
      if (chip) {
        chip.classList.remove('speak', 'listen');
        chip.classList.add('analyze');
        chip.innerHTML = '<span class="ic"></span>Scored';
      }
      if (conv) conv.scrollTop = conv.scrollHeight; // show the final score
      return; // no timers, no video, nothing to clean
    }

    // ---- helpers ----
    const setChip = (state: 'speak' | 'listen' | 'analyze' | 'idle') => {
      if (!chip) return;
      chip.classList.remove('speak', 'listen', 'analyze');
      stateEl?.classList.remove('speak', 'listen', 'analyze');
      listenOverlay?.classList.remove('on');
      tileBars?.classList.remove('active');
      videoTile?.classList.remove('speaking', 'listening');
      if (state === 'speak') {
        chip.classList.add('speak');
        stateEl?.classList.add('speak');
        chip.innerHTML = '<span class="ic"></span>Speaking';
        tileBars?.classList.add('active');
        videoTile?.classList.add('speaking');
      } else if (state === 'listen') {
        chip.classList.add('listen');
        stateEl?.classList.add('listen');
        chip.innerHTML = '<span class="ic"></span>Listening';
        listenOverlay?.classList.add('on');
        videoTile?.classList.add('listening');
      } else if (state === 'analyze') {
        chip.classList.add('analyze');
        stateEl?.classList.add('analyze');
        chip.innerHTML = '<span class="ic"></span>Analyzing…';
      } else {
        chip.classList.add('analyze');
        stateEl?.classList.add('analyze');
        chip.innerHTML = '<span class="ic"></span>Idle';
      }
    };

    const setMic = (state: 'listen' | 'muted') => {
      if (!micEl) return;
      micEl.classList.remove('active', 'muted');
      micEl.classList.add(state === 'listen' ? 'active' : 'muted');
    };

    const setNext = (state: 'disabled' | 'pulse') => {
      if (!nextBtn || !nextBtnLabel) return;
      nextBtn.classList.remove('disabled', 'pulse');
      if (state === 'disabled') nextBtn.classList.add('disabled');
      else nextBtn.classList.add('pulse');
      nextBtnLabel.textContent = 'Next question';
    };

    const typeText = async (el: HTMLElement, str: string, perCharMs: number, keepCaret = true) => {
      const parent = el.closest('.block');
      parent?.classList.add('typing');
      el.innerHTML = '';
      const caret = document.createElement('span');
      caret.className = 'caret';
      if (keepCaret) el.appendChild(caret);
      for (let i = 0; i < str.length; i++) {
        if (cancelled) return;
        el.insertBefore(document.createTextNode(str[i]), keepCaret ? caret : null);
        // brief natural pause after sentence punctuation
        const extra = /[.?!,]/.test(str[i]) ? perCharMs * 4 : 0;
        await sleep(jitter(perCharMs) + extra);
      }
      parent?.classList.remove('typing');
      if (keepCaret) caret.remove();
      pin(parent); // scroll once after typing, not per character
    };

    const streamWords = async (el: HTMLElement, str: string, perWordMs: number) => {
      const words = str.split(' ');
      const blk = el.closest('.block');
      el.innerHTML = '';
      let wi = 0;
      for (const w of words) {
        if (cancelled) return;
        const s = document.createElement('span');
        s.className = 'word';
        s.textContent = w + ' ';
        el.appendChild(s);
        raf(() => s.classList.add('in'));
        if (++wi % 3 === 0) pin(blk); // scroll occasionally, not every word
        // natural cadence: short words quicker, long words slower, pause after punctuation
        let d = perWordMs;
        if (w.length <= 3) d *= 0.72;
        else if (w.length >= 9) d *= 1.16;
        if (/[.,!?…]$/.test(w)) d += perWordMs * 1.6;
        await sleep(jitter(d));
      }
      pin(blk);
    };

    const resetFbBars = () => {
      SCORE_KEYS.forEach((k) => {
        const fill = fbFill(k);
        const val = fbVal(k);
        if (fill) {
          fill.style.width = '0%';
          fill.className = 'fb-bar-fill';
        }
        if (val) val.textContent = '—';
      });
      if (fbTotal) fbTotal.innerHTML = '—<small>/10</small>';
    };

    // Score bars: set final widths/colors/numbers in one synchronous pass. The grow
    // is a pure-CSS scaleX (staggered) keyed off `.block.fb.show` — no rAF, no layout
    // thrash, no long tasks.
    const paintFbBars = (turn: Turn) => {
      SCORE_KEYS.forEach((k) => {
        const fill = fbFill(k);
        const val = fbVal(k);
        if (fill) {
          fill.className = 'fb-bar-fill';
          fill.style.width = turn.scores[k] * 10 + '%';
          if (turn.barColors[k]) fill.classList.add(turn.barColors[k]);
        }
        if (val) val.textContent = turn.scores[k].toFixed(1);
      });
      if (fbTotal) fbTotal.innerHTML = turn.total.toFixed(1) + '<small>/10</small>';
    };

    // ---- per-question timer ----
    // The ring drains via CSS (off the JS thread). A 1s interval updates only the
    // number text node (cheap) and the urgency colour — no per-tick SVG writes.
    const startTimer = () => {
      const timerStart = performance.now();
      const initial = fmtTime(QUESTION_SECONDS);
      const ringNum = ringTimer?.querySelector('.num') as HTMLElement | null;
      if (qTimer) {
        qTimer.textContent = initial;
        (qTimer as HTMLElement).style.color = '';
      }
      if (ringNum) ringNum.textContent = String(QUESTION_SECONDS);
      if (ringTimer) (ringTimer as HTMLElement).style.color = '';
      if (qBlockTimer) qBlockTimer.textContent = 'Time left · ' + initial;
      if (ringFg) {
        ringFg.classList.remove('draining');
        (ringFg as SVGElement & { style: CSSStyleDeclaration }).style.stroke = '';
        void ringFg.getBoundingClientRect(); // reflow to restart the CSS drain
        (ringFg as SVGElement & { style: CSSStyleDeclaration }).style.setProperty(
          '--drain-dur',
          QUESTION_SECONDS + 's',
        );
        ringFg.classList.add('draining');
      }
      if (interval) clearInterval(interval);
      interval = window.setInterval(() => {
        if (cancelled) return;
        const remaining = Math.max(0, QUESTION_SECONDS - (performance.now() - timerStart) / 1000);
        const display = fmtTime(remaining);
        if (qTimer) qTimer.textContent = display;
        if (qBlockTimer) qBlockTimer.textContent = 'Time left · ' + display;
        if (ringNum) ringNum.textContent = String(Math.max(0, Math.ceil(remaining)));
        const red = remaining <= 15;
        if (ringFg) (ringFg as SVGElement & { style: CSSStyleDeclaration }).style.stroke = red ? 'var(--accent-danger)' : '';
        if (ringTimer) (ringTimer as HTMLElement).style.color = red ? 'var(--accent-danger)' : '';
        if (qTimer) (qTimer as HTMLElement).style.color = red ? 'var(--accent-danger)' : '';
        if (remaining <= 0 && interval) {
          clearInterval(interval);
          interval = null;
        }
      }, 1000);
    };

    const simulateNextClick = async () => {
      if (!simCursor || !nextBtn || !sim) return;
      const rect = nextBtn.getBoundingClientRect();
      const simRect = sim.getBoundingClientRect();
      const tx = rect.left + rect.width / 2 - simRect.left;
      const ty = rect.top + rect.height / 2 - simRect.top;
      const cur = simCursor as unknown as HTMLElement;
      cur.style.left = tx - 70 + 'px';
      cur.style.top = ty + 28 + 'px';
      simCursor.classList.add('show');
      await sleep(80);
      if (cancelled) return;
      cur.style.left = tx - 4 + 'px';
      cur.style.top = ty - 4 + 'px';
      await sleep(700);
      if (cancelled) return;
      simCursor.classList.add('click');
      (nextBtn as HTMLElement).style.transform = 'scale(0.97)';
      await sleep(140);
      if (cancelled) return;
      (nextBtn as HTMLElement).style.transform = '';
      simCursor.classList.remove('click');
      await sleep(250);
      simCursor.classList.remove('show');
    };

    // ---- main loop ----
    let turnIdx = 0;
    const runTurn = async () => {
      if (cancelled) return;
      const turn = TURNS[turnIdx % TURNS.length];
      const qNum = (turnIdx % 4) + 1;

      [blockA, blockFu, blockA2, blockFb].forEach((b) => b?.classList.remove('show'));
      resetFbBars();
      if (conv) conv.scrollTop = 0;
      if (qBody) qBody.innerHTML = '<span class="caret"></span>';
      if (aBody) aBody.innerHTML = '';
      if (fuBody) fuBody.innerHTML = '';
      if (a2Body) a2Body.innerHTML = '';
      if (qIndicator) qIndicator.textContent = qNum + ' / 4';
      if (aLabel) aLabel.textContent = 'Your answer · waiting';
      setNext('disabled');

      // Phase 1 — Meera speaks the question
      setChip('speak');
      setMic('muted');
      if (footStatus) footStatus.textContent = 'Meera is reading the question…';
      setProgress(0);
      startTimer();
      await sleep(380);
      if (cancelled) return;
      if (qBody) await typeText(qBody, turn.question, 18);
      if (cancelled) return;
      await sleep(420);
      if (cancelled) return;

      // Phase 2 — candidate answers
      setChip('listen');
      setMic('listen');
      if (aLabel) aLabel.textContent = 'Your answer · listening';
      if (footStatus) footStatus.textContent = 'Sample session · you are speaking';
      blockA?.classList.add('show');
      await sleep(240);
      if (cancelled) return;
      if (aBody) await streamWords(aBody, turn.answer, 62);
      if (cancelled) return;
      setProgress(35);

      // Phase 3 — AI evaluates
      setChip('analyze');
      setMic('muted');
      if (aLabel) aLabel.textContent = 'Your answer · submitted';
      if (footStatus) footStatus.textContent = 'Analyzing answer · checking for vague claims…';
      aBody?.classList.add('analyzing-shimmer');
      await sleep(1200);
      if (cancelled) return;
      aBody?.classList.remove('analyzing-shimmer');

      // Phase 4 — adaptive follow-up
      setChip('speak');
      if (footStatus) footStatus.textContent = 'Follow-up generated · Meera is asking…';
      blockFu?.classList.add('show');
      await sleep(300);
      if (cancelled) return;
      if (fuBody) await typeText(fuBody, turn.followup, 18, false);
      if (cancelled) return;
      setProgress(55);
      await sleep(300);
      if (cancelled) return;

      // Phase 5 — candidate answers follow-up
      setChip('listen');
      setMic('listen');
      if (footStatus) footStatus.textContent = 'Sample session · follow-up answer';
      blockA2?.classList.add('show');
      await sleep(240);
      if (cancelled) return;
      if (a2Body) await streamWords(a2Body, turn.answer2, 58);
      if (cancelled) return;
      setProgress(85);

      // Phase 6 — answer feedback (widths/numbers set once; CSS animates the grow)
      setChip('analyze');
      setMic('muted');
      if (footStatus) footStatus.textContent = 'Scoring your answer…';
      paintFbBars(turn);
      blockFb?.classList.add('show');
      pin(blockFb);
      await sleep(1100);
      if (cancelled) return;
      setProgress(Math.round(turn.total * 10));

      // Phase 7 — next button pulses, cursor clicks
      if (footStatus) footStatus.textContent = 'Question scored · move to next';
      setNext('pulse');
      await sleep(1000);
      if (cancelled) return;
      await simulateNextClick();
      if (cancelled) return;
      await sleep(380);
      if (cancelled) return;
      if (interval) {
        clearInterval(interval);
        interval = null;
      }

      turnIdx++;
      runTurn();
    };

    // Defer ALL active work (video playback + animation loop) until the browser is
    // idle, so the simulator never competes with hydration/initial paint → lower TBT.
    // The static shell is already server-rendered, so the card is visible & stable first.
    type IdleW = Window & {
      requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number;
      cancelIdleCallback?: (h: number) => void;
    };
    const iw = window as IdleW;
    const usedIdle = typeof iw.requestIdleCallback === 'function';

    const beginActive = () => {
      if (cancelled) return;
      if (video) {
        video.muted = true;
        if ('IntersectionObserver' in window) {
          io = new IntersectionObserver(
            (entries) => {
              entries.forEach((entry) => {
                if (entry.isIntersecting) video.play().catch(() => {});
                else video.pause();
              });
            },
            { threshold: 0.15 },
          );
          io.observe(video);
        } else {
          video.play().catch(() => {});
        }
      }
      runTurn();
    };

    const idleHandle: number = usedIdle
      ? iw.requestIdleCallback!(beginActive, { timeout: 1800 })
      : (window.setTimeout(beginActive, 300) as unknown as number);

    return () => {
      cancelled = true;
      if (usedIdle) iw.cancelIdleCallback?.(idleHandle);
      else clearTimeout(idleHandle);
      timeouts.forEach((id) => clearTimeout(id));
      rafs.forEach((id) => cancelAnimationFrame(id));
      pendingResolvers.forEach((fn) => fn());
      if (interval) clearInterval(interval);
      if (io) io.disconnect();
      if (video) {
        try {
          video.pause();
        } catch {
          /* noop */
        }
      }
    };
  }, []);

  return (
    <div
      className="sim-host"
      ref={rootRef}
      aria-hidden="true"
    >
      <div className="sim">
        {/* animated cursor */}
        <svg className="sim-cursor" viewBox="0 0 24 24" fill="none">
          <path
            d="M5 2 L5 18 L9 14 L11.5 21 L14 20 L11.5 13 L17 13 Z"
            fill="var(--text-primary)"
            stroke="var(--card-bg)"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
        </svg>

        {/* chrome */}
        <div className="sim-chrome">
          <div className="sim-dots">
            <span />
            <span />
            <span />
          </div>
          <div className="sim-url">interviewera.com/session/sample</div>
          <div className="sim-chrome-right">⌘ K</div>
        </div>

        {/* header */}
        <div className="sim-header">
          <div>
            <div className="sim-title">Sample Session</div>
            <div className="sim-title-main">
              Focus Mode <span className="mode">· Backend track · L3</span>
            </div>
          </div>
          <div className="sim-meta">
            <div className="sim-meta-block">
              <div className="sim-meta-label">Question</div>
              <div className="sim-meta-val" data-sim="qIndicator">
                1 / 4
              </div>
            </div>
            <div className="sim-meta-block">
              <div className="sim-meta-label">Time left</div>
              <div className="sim-meta-val accent" data-sim="qTimer">
                01:30
              </div>
            </div>
            <span className="sim-exit-btn" aria-hidden="true">
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path d="M3 3l6 6M3 9l6-6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              Exit
            </span>
          </div>
        </div>

        {/* stage */}
        <div className="sim-stage">
          <div className="sim-left">
            <div className="sim-video-tile">
              <LandingHeroSimulatorPoster />
              <video loop muted playsInline preload="none" tabIndex={-1}>
                <source src="/assets/female-ai.mp4" type="video/mp4" />
              </video>
              <div className="sim-listen-overlay" />
              <div className="sim-tile-name">
                <span className="name">Meera · HR round</span>
              </div>
            </div>

            {/* Component 1 — avatar's live state, shown as a waveform */}
            <div className="sim-state speak" data-sim="state">
              <div className="sim-chip speak">
                <span className="ic" />
                Speaking
              </div>
              <div className="sim-wave" aria-hidden>
                {WAVE.map((d, i) => (
                  <i key={i} style={{ animationDelay: d }} />
                ))}
              </div>
            </div>

            {/* Component 2 — overall interview progress (separate concern) */}
            <div className="sim-progress">
              <div className="sim-progress-head">
                <span className="sim-progress-label">Interview progress</span>
                <span className="sim-tile-progress">0%</span>
              </div>
              <div className="sim-status-track">
                <div className="sim-status-fill" data-sim="progressFill" />
              </div>
            </div>

            <div className="sim-tile-timer">
              <div className="sim-ring-wrap">
                <svg className="ring" viewBox="0 0 100 100" aria-hidden="true">
                  <circle className="ring-bg" cx="50" cy="50" r="42" fill="none" strokeWidth="9" />
                  <circle
                    className="ring-fg"
                    data-sim="ringFg"
                    cx="50"
                    cy="50"
                    r="42"
                    fill="none"
                    strokeWidth="9"
                    strokeLinecap="round"
                    strokeDasharray="263.894"
                    strokeDashoffset="0"
                    transform="rotate(-90 50 50)"
                  />
                </svg>
                <div className="sim-ring-label" data-sim="ringTimer">
                  <span className="num">90</span>
                  <span className="u">Seconds</span>
                </div>
              </div>
            </div>
          </div>

          {/* conversation */}
          <div className="sim-conv">
            <div className="block q show">
              <div className="block-eyebrow">
                <span className="left">
                  <span className="dot" />
                  Current question
                </span>
                <span className="timer" data-sim="qBlockTimer">
                  Time left · 01:30
                </span>
              </div>
              <div className="block-body" data-sim="qBody">
                <span className="caret" />
              </div>
            </div>

            <div className="block a">
              <div className="block-eyebrow">
                <span className="left">
                  <span className="dot" />
                  <span data-sim="aLabel">Your answer · listening</span>
                </span>
                <span className="wave active">
                  <i />
                  <i />
                  <i />
                  <i />
                </span>
              </div>
              <div className="block-body" data-sim="aBody" />
            </div>

            <div className="block fu">
              <div className="block-eyebrow">
                <span className="left">
                  <span className="dot" />
                  <span className="pill">Adaptive follow-up</span>
                </span>
                <span style={{ color: 'var(--accent-warning)' }}>Detected: vague claim</span>
              </div>
              <div className="block-body" data-sim="fuBody" />
            </div>

            <div className="block a2">
              <div className="block-eyebrow">
                <span className="left">
                  <span className="dot" style={{ background: 'var(--accent-danger)' }} />
                  Your follow-up answer · listening
                </span>
                <span className="wave active">
                  <i />
                  <i />
                  <i />
                  <i />
                </span>
              </div>
              <div className="block-body" data-sim="a2Body" />
            </div>

            <div className="block fb">
              <div className="fb-head">
                <div>
                  <div className="block-eyebrow" style={{ margin: 0 }}>
                    <span className="left">
                      <span className="dot" />
                      Answer Feedback · this question
                    </span>
                  </div>
                  <div className="fb-title" style={{ marginTop: 6 }}>
                    Scored on every answer
                  </div>
                </div>
                <div className="fb-total" data-sim="fbTotal">
                  —<small>/10</small>
                </div>
              </div>
              <div className="fb-bars">
                <div className="fb-bar">
                  <span className="fb-bar-label">Communication Clarity</span>
                  <span className="fb-bar-val" data-key="clarity">
                    —
                  </span>
                  <div className="fb-bar-track">
                    <div className="fb-bar-fill" data-key="clarity" />
                  </div>
                </div>
                <div className="fb-bar">
                  <span className="fb-bar-label">Content Accuracy</span>
                  <span className="fb-bar-val" data-key="content">
                    —
                  </span>
                  <div className="fb-bar-track">
                    <div className="fb-bar-fill" data-key="content" />
                  </div>
                </div>
                <div className="fb-bar">
                  <span className="fb-bar-label">Answer Structure</span>
                  <span className="fb-bar-val" data-key="structure">
                    —
                  </span>
                  <div className="fb-bar-track">
                    <div className="fb-bar-fill" data-key="structure" />
                  </div>
                </div>
                <div className="fb-bar">
                  <span className="fb-bar-label">Specificity</span>
                  <span className="fb-bar-val" data-key="specificity">
                    —
                  </span>
                  <div className="fb-bar-track">
                    <div className="fb-bar-fill" data-key="specificity" />
                  </div>
                </div>
                <div className="fb-bar" style={{ gridColumn: '1 / -1' }}>
                  <span className="fb-bar-label">Relevance</span>
                  <span className="fb-bar-val" data-key="relevance">
                    —
                  </span>
                  <div className="fb-bar-track">
                    <div className="fb-bar-fill" data-key="relevance" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* foot */}
        <div className="sim-foot">
          <div className="sim-foot-left">
            <div className="sim-mic muted">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M8 1.5a2 2 0 00-2 2v5a2 2 0 104 0v-5a2 2 0 00-2-2z" stroke="currentColor" strokeWidth="1.4" />
                <path d="M3.5 7.5v1a4.5 4.5 0 009 0v-1M8 13v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </div>
            <span className="sim-foot-status" data-sim="footStatus">
              AI is reading the question…
            </span>
          </div>
          <div className="sim-foot-right">
            <span className="sim-prev-btn disabled" aria-hidden="true">
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path d="M7 9L3 6l4-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Previous
            </span>
            <span className="sim-next-btn primary disabled" aria-hidden="true">
              <span data-sim="nextLabel">Next question</span>
              <span className="arrow">→</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
