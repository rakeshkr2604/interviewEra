'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { LandingHeroSimulatorPoster } from '@/components/landing/LandingHeroSimulatorPoster';
import {
  SCROLL_SHOWCASE_EQ_BARS,
  SCROLL_SHOWCASE_INTRO,
  SCROLL_SHOWCASE_REPORT_DIMS,
  SCROLL_SHOWCASE_REPORT_SCORE,
  SCROLL_SHOWCASE_STEPS,
} from '@/components/landing/LandingScrollShowcase.data';
import {
  LANDING_DEMO_DISCLOSURE,
  LANDING_SAMPLE_SESSION_LABEL,
} from '@/lib/landing/demo-disclosure';
import { cn } from '@/lib/utils';
import './LandingScrollShowcase.css';

const SS_INNER = 'ie-ss-panel__inner mx-auto w-full px-4 sm:px-6';

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !('matchMedia' in window)) return false;
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/** Desktop-only heavy motion: fine pointer + hover + wide viewport. */
function canUseParallax(): boolean {
  if (typeof window === 'undefined' || !('matchMedia' in window)) return false;
  try {
    return window.matchMedia('(min-width: 1024px) and (hover: hover) and (pointer: fine)').matches;
  } catch {
    return false;
  }
}

function isCoarsePointer(): boolean {
  if (typeof window === 'undefined' || !('matchMedia' in window)) return false;
  try {
    return window.matchMedia('(pointer: coarse), (max-width: 1023px)').matches;
  } catch {
    return false;
  }
}

function saveDataEnabled(): boolean {
  if (typeof navigator === 'undefined') return false;
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return Boolean(conn?.saveData);
}

function Badge({ children }: { children: ReactNode }) {
  return (
    <div className="ie-ss-badge">
      <span className="ie-ss-badge__dot" aria-hidden />
      <span className="ie-ss-badge__text">{children}</span>
    </div>
  );
}

function ResumeCard({ question }: { question: string }) {
  return (
    <div className="ie-ss-card-wrap">
      <div className="ie-ss-card" data-card="">
        <div className="ie-ss-resume-head">
          <div className="ie-ss-resume-avatar" aria-hidden />
          <div className="ie-ss-resume-skel">
            <div className="ie-ss-resume-skel__a" />
            <div className="ie-ss-resume-skel__b" />
          </div>
        </div>
        <div className="ie-ss-resume-lines">
          {[90, 72, 86, 58, 80].map((w, i) => (
            <div
              key={i}
              className={cn('ie-ss-resume-line', (i === 1 || i === 3) && 'ie-ss-resume-line--accent')}
              style={{ width: `${w}%` }}
            />
          ))}
        </div>
        <div className="ie-ss-resume-q">
          <div className="ie-ss-eyebrow">GENERATED QUESTION</div>
          <p className="ie-ss-quote">{question}</p>
        </div>
        <div className="ie-ss-scan" aria-hidden />
      </div>
    </div>
  );
}

function VoiceCard({ followUp }: { followUp: string }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaRef = useRef<HTMLDivElement | null>(null);
  // Start without video (SSR-safe). Mount only after client confirms desktop capability.
  const [showVideo, setShowVideo] = useState(false);

  useEffect(() => {
    if (prefersReducedMotion() || saveDataEnabled() || isCoarsePointer()) return;
    const raf = requestAnimationFrame(() => setShowVideo(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const v = videoRef.current;
    const media = mediaRef.current;
    if (!v || !media || !showVideo) return;

    if (!('IntersectionObserver' in window)) {
      void v.play().catch(() => {});
      return () => {
        v.pause();
      };
    }

    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        if (entry.isIntersecting) {
          void v.play().catch(() => {});
        } else {
          v.pause();
        }
      },
      { threshold: 0.35 },
    );
    io.observe(media);
    return () => {
      io.disconnect();
      v.pause();
    };
  }, [showVideo]);

  return (
    <div className="ie-ss-card-wrap">
      <div className="ie-ss-card ie-ss-card--voice" data-card="">
        <div className="ie-ss-media" ref={mediaRef}>
          <LandingHeroSimulatorPoster />
          {showVideo ? (
            <video
              ref={videoRef}
              muted
              loop
              playsInline
              preload="none"
              poster="/assets/female-avatar-600.webp"
              aria-hidden
            >
              <source src="/assets/female-ai.mp4" type="video/mp4" />
            </video>
          ) : null}
          {/* Soft cover over baked-in Gemini sparkle (right mid of source footage). */}
          <span className="ie-ss-media__scrub" aria-hidden />
          <div className="ie-ss-live-badge">
            <span className="ie-ss-blink ie-ss-live-badge__dot" aria-hidden />
            <span className="ie-ss-live-badge__text">{LANDING_SAMPLE_SESSION_LABEL}</span>
          </div>
        </div>

        <div className="ie-ss-eq" aria-hidden>
          {/* 8 bars everywhere — enough presence, half the animation cost of 16 */}
          {SCROLL_SHOWCASE_EQ_BARS.slice(0, 8).map((b, i) => (
            <div
              key={i}
              className="ie-ss-eq-bar"
              style={{
                height: Math.round(b.h * 1.1),
                ['--ss-eq-dur' as string]: `${b.dur}s`,
                ['--ss-eq-delay' as string]: `${b.d}s`,
              }}
            />
          ))}
        </div>

        <div className="ie-ss-followup">
          <div className="ie-ss-followup__head">
            <span className="ie-ss-blink ie-ss-followup__dot" aria-hidden />
            <span className="ie-ss-eyebrow ie-ss-eyebrow--voice">Adaptive Follow-up Questions</span>
          </div>
          <p className="ie-ss-quote">{followUp}</p>
        </div>
      </div>
    </div>
  );
}

function ReportCard({
  filled,
  score,
  verdict,
}: {
  filled: boolean;
  score: number;
  verdict: string;
}) {
  return (
    <div className="ie-ss-card-wrap">
      <div className="ie-ss-card" data-card="">
        <div className="ie-ss-report-head">
          <div>
            <div className="ie-ss-eyebrow">INTERVIEW REPORT</div>
            <div className="ie-ss-report-meta">Backend · Round 2</div>
          </div>
          <div className="ie-ss-report-score-wrap">
            <span className="ie-ss-report-score">{score.toFixed(1)}</span>
            <span className="ie-ss-report-denom">/10</span>
          </div>
        </div>
        <div className="ie-ss-report-dims">
          {SCROLL_SHOWCASE_REPORT_DIMS.map((d, i) => (
            <div key={d.label} className="ie-ss-report-dim">
              <div className="ie-ss-report-dim__row">
                <span className="ie-ss-report-dim__label">{d.label}</span>
                <span className="ie-ss-report-dim__pct">{d.w}%</span>
              </div>
              <div className="ie-ss-bar-track">
                <div
                  className="ie-ss-bar-fill"
                  data-filled={filled ? 'true' : 'false'}
                  style={{
                    ['--ss-bar-w' as string]: `${d.w}%`,
                    transitionDelay: filled ? `${0.15 + i * 0.12}s` : '0s',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="ie-ss-verdict">
          <span className="ie-ss-verdict__dot" aria-hidden />
          <span className="ie-ss-verdict__text">{verdict}</span>
        </div>
      </div>
    </div>
  );
}

function PanelCopy({
  label,
  title,
  body,
  fromRight = false,
  labelClassName,
  reveal = true,
}: {
  label: string;
  title: string;
  body: string;
  fromRight?: boolean;
  labelClassName?: string;
  /** Desktop panels use IO reveal; mobile carousel slides start visible. */
  reveal?: boolean;
}) {
  return (
    <div
      className={cn(
        'ie-ss-copy',
        reveal && 'ie-ss-reveal',
        reveal && fromRight && 'ie-ss-reveal--from-right',
        !reveal && 'is-revealed',
      )}
      data-reveal={reveal ? '' : undefined}
    >
      <div className={cn('ie-ss-label', labelClassName)}>{label}</div>
      <h3 className="ie-ss-title">{title}</h3>
      <p className="ie-ss-body">{body}</p>
    </div>
  );
}

function FeatureVisual({
  step,
  reportFilled,
  reportScore,
}: {
  step: (typeof SCROLL_SHOWCASE_STEPS)[number];
  reportFilled: boolean;
  reportScore: number;
}) {
  if (step.id === 'voice') return <VoiceCard followUp={step.followUp} />;
  if (step.id === 'report') {
    return <ReportCard filled={reportFilled} score={reportScore} verdict={step.verdict} />;
  }
  return <ResumeCard question={step.generatedQuestion} />;
}

export default function LandingScrollShowcase() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const panelRefs = useRef<(HTMLElement | null)[]>([]);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const slideRefs = useRef<(HTMLElement | null)[]>([]);
  const [slide, setSlide] = useState(0);
  // SSR + first paint: mobile carousel (lighter). Desktop panels mount after matchMedia.
  const [isMobileLayout, setIsMobileLayout] = useState(true);
  const [reportFilled, setReportFilled] = useState(false);
  const [reportScore, setReportScore] = useState(0);
  const reportStarted = useRef(false);

  useEffect(() => {
    let mql: MediaQueryList | null = null;
    let raf = 0;
    try {
      mql = window.matchMedia('(max-width: 1023px)');
      const sync = () => {
        raf = requestAnimationFrame(() => setIsMobileLayout(mql!.matches));
      };
      sync();
      if (typeof mql.addEventListener === 'function') {
        mql.addEventListener('change', sync);
        return () => {
          cancelAnimationFrame(raf);
          mql?.removeEventListener('change', sync);
        };
      }
      mql.addListener(sync);
      return () => {
        cancelAnimationFrame(raf);
        mql?.removeListener(sync);
      };
    } catch {
      raf = requestAnimationFrame(() => setIsMobileLayout(false));
      return () => cancelAnimationFrame(raf);
    }
  }, []);

  const startReportAnim = useCallback(() => {
    if (reportStarted.current) return;
    reportStarted.current = true;
    const reduce = prefersReducedMotion();
    setReportFilled(true);
    if (reduce) {
      setReportScore(SCROLL_SHOWCASE_REPORT_SCORE);
      return;
    }
    const target = SCROLL_SHOWCASE_REPORT_SCORE;
    const t0 = performance.now();
    const duration = isCoarsePointer() ? 700 : 1200;
    let raf = 0;
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / duration);
      setReportScore(Number((target * (1 - Math.pow(1 - p, 3))).toFixed(1)));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Gate continuous animations while #how is on-screen.
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const setInViewClass = (on: boolean) => {
      section.classList.toggle('is-in-view', on);
    };

    if (!('IntersectionObserver' in window)) {
      setInViewClass(true);
      return;
    }

    const sectionIo = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry) setInViewClass(entry.isIntersecting);
      },
      { root: null, rootMargin: '12% 0px', threshold: 0.05 },
    );
    sectionIo.observe(section);
    return () => sectionIo.disconnect();
  }, []);

  // Desktop: reveal copy blocks + trigger report fill when panels enter view.
  useEffect(() => {
    if (isMobileLayout) return;
    const reduce = prefersReducedMotion();
    const nodes = panelRefs.current.filter(Boolean) as HTMLElement[];
    let raf = 0;

    const revealAll = () => {
      for (const panel of nodes) {
        panel.querySelectorAll('[data-reveal]').forEach((n) => {
          n.classList.add('is-revealed');
        });
      }
    };

    const scheduleReport = () => {
      raf = requestAnimationFrame(() => {
        startReportAnim();
      });
    };

    if (reduce || !('IntersectionObserver' in window)) {
      revealAll();
      scheduleReport();
      return () => cancelAnimationFrame(raf);
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const t = entry.target as HTMLElement;
          t.classList.add('is-revealed');
          io.unobserve(t);
          if (t.hasAttribute('data-fillgroup')) scheduleReport();
        }
      },
      { threshold: 0.25, rootMargin: '0px 0px -8% 0px' },
    );

    for (const panel of nodes) {
      panel.querySelectorAll('[data-reveal]').forEach((n) => io.observe(n));
    }

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, [startReportAnim, isMobileLayout]);

  // Mobile carousel: track active slide via scroll-snap + IO; animate report on slide 2.
  useEffect(() => {
    if (!isMobileLayout) return;
    const track = trackRef.current;
    if (!track || !('IntersectionObserver' in window)) return;

    const io = new IntersectionObserver(
      (entries) => {
        let bestIdx = -1;
        let bestRatio = 0;
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const idx = slideRefs.current.indexOf(entry.target as HTMLElement);
          if (idx >= 0 && entry.intersectionRatio > bestRatio) {
            bestRatio = entry.intersectionRatio;
            bestIdx = idx;
          }
        }
        if (bestIdx < 0) return;
        setSlide(bestIdx);
        if (bestIdx === 2) {
          requestAnimationFrame(() => startReportAnim());
        }
      },
      { root: track, threshold: [0.55, 0.75, 1] },
    );

    for (const node of slideRefs.current) {
      if (node) io.observe(node);
    }
    return () => io.disconnect();
  }, [startReportAnim, isMobileLayout]);

  const goToSlide = useCallback((idx: number) => {
    const node = slideRefs.current[idx];
    if (!node) return;
    node.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', inline: 'center', block: 'nearest' });
    setSlide(idx);
    if (idx === 2) startReportAnim();
  }, [startReportAnim]);

  // Desktop-only scroll parallax — skipped on touch / narrow / reduced-motion.
  useEffect(() => {
    if (prefersReducedMotion()) return;

    let tick = false;
    let attached = false;

    const clearTransforms = () => {
      for (const panel of panelRefs.current) {
        if (!panel) continue;
        const card = panel.querySelector<HTMLElement>('[data-card]');
        if (card) card.style.transform = '';
        panel.querySelectorAll<HTMLElement>('[data-blob]').forEach((bl) => {
          bl.style.transform = '';
        });
      }
    };

    const update = () => {
      tick = false;
      if (!canUseParallax()) return;
      const H = window.innerHeight;
      for (const panel of panelRefs.current) {
        if (!panel) continue;
        const r = panel.getBoundingClientRect();
        if (r.bottom < 0 || r.top > H) continue;

        let prog = (H / 2 - (r.top + r.height / 2)) / H + 0.5;
        prog = Math.min(1, Math.max(0, prog));

        const card = panel.querySelector<HTMLElement>('[data-card]');
        if (card) {
          const ry = (prog - 0.5) * 28;
          const rx = (0.5 - prog) * 6;
          const sc = 1 - Math.abs(prog - 0.5) * 0.06;
          card.style.transform = `rotateY(${ry.toFixed(2)}deg) rotateX(${rx.toFixed(2)}deg) scale(${sc.toFixed(3)})`;
        }

        panel.querySelectorAll<HTMLElement>('[data-blob]').forEach((bl, i) => {
          bl.style.transform = `translate3d(0, ${((prog - 0.5) * (i % 2 ? -40 : 50)).toFixed(1)}px, 0)`;
        });
      }
    };

    const onScroll = () => {
      if (tick) return;
      tick = true;
      requestAnimationFrame(update);
    };

    const syncListeners = () => {
      const enable = canUseParallax();
      if (enable && !attached) {
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll, { passive: true });
        attached = true;
        onScroll();
      } else if (!enable && attached) {
        window.removeEventListener('scroll', onScroll);
        window.removeEventListener('resize', onScroll);
        attached = false;
        clearTransforms();
      } else if (!enable) {
        clearTransforms();
      }
    };

    syncListeners();

    let mql: MediaQueryList | null = null;
    try {
      mql = window.matchMedia('(min-width: 1024px) and (hover: hover) and (pointer: fine)');
      const onChange = () => syncListeners();
      if (typeof mql.addEventListener === 'function') {
        mql.addEventListener('change', onChange);
        return () => {
          mql?.removeEventListener('change', onChange);
          if (attached) {
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', onScroll);
          }
          clearTransforms();
        };
      }
      mql.addListener(onChange);
      return () => {
        mql?.removeListener(onChange);
        if (attached) {
          window.removeEventListener('scroll', onScroll);
          window.removeEventListener('resize', onScroll);
        }
        clearTransforms();
      };
    } catch {
      syncListeners();
      return () => {
        if (attached) {
          window.removeEventListener('scroll', onScroll);
          window.removeEventListener('resize', onScroll);
        }
        clearTransforms();
      };
    }
  }, []);

  const [resume, voice, report] = SCROLL_SHOWCASE_STEPS;

  return (
    <section
      ref={sectionRef}
      id="how"
      className="ie-scroll-showcase"
      aria-labelledby="scroll-showcase-heading"
    >
      {/* Intro */}
      <div
        className="ie-ss-panel ie-ss-panel--intro"
        ref={(el) => {
          panelRefs.current[0] = el;
        }}
      >
        <div className="ie-ss-panel__blob ie-ss-panel__blob--intro-a" data-blob="" aria-hidden />
        <div className="ie-ss-panel__blob ie-ss-panel__blob--intro-b" data-blob="" aria-hidden />
        <div className={SS_INNER}>
          <div className="ie-ss-intro">
            <Badge>{SCROLL_SHOWCASE_INTRO.badge}</Badge>
            <h2 id="scroll-showcase-heading" className="ie-ss-intro__headline">
              <span className="ie-ss-intro__line1">{SCROLL_SHOWCASE_INTRO.headlineLine1}</span>
              <br />
              <span className="ie-ss-intro__line2">{SCROLL_SHOWCASE_INTRO.headlineLine2}</span>
            </h2>
            <p className="ie-ss-intro__body">{SCROLL_SHOWCASE_INTRO.body}</p>
            <div className="ie-ss-scroll-hint ie-ss-scroll-hint--desktop" aria-hidden>
              <span className="ie-ss-scroll-hint__label">SCROLL</span>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                <path
                  d="M3 6l5 5 5-5"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className="ie-ss-scroll-hint ie-ss-scroll-hint--mobile" aria-hidden>
              <span className="ie-ss-scroll-hint__label">SWIPE</span>
              <svg width="18" height="16" viewBox="0 0 18 16" fill="none" aria-hidden>
                <path
                  d="M6 3l-4 5 4 5M12 3l4 5-4 5"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile: swipeable feature carousel */}
      {isMobileLayout ? (
        <div className="ie-ss-mobile">
          <div
            ref={trackRef}
            className="ie-ss-track"
            tabIndex={0}
            role="region"
            aria-roledescription="carousel"
            aria-label="How InterviewEra works"
          >
            {SCROLL_SHOWCASE_STEPS.map((step, i) => (
              <article
                key={step.id}
                className="ie-ss-slide"
                ref={(el) => {
                  slideRefs.current[i] = el;
                }}
                aria-label={`${step.label}: ${step.title}`}
                aria-current={slide === i ? 'true' : undefined}
              >
                <div className="ie-ss-slide__inner">
                  <div className="ie-ss-visual-slot">
                    <FeatureVisual step={step} reportFilled={reportFilled} reportScore={reportScore} />
                  </div>
                  <PanelCopy
                    label={step.label}
                    title={step.title}
                    body={step.body}
                    labelClassName={step.id === 'voice' ? 'ie-ss-label--voice' : undefined}
                    reveal={false}
                  />
                </div>
              </article>
            ))}
          </div>

          <div className="ie-ss-dots" role="tablist" aria-label="Feature steps">
            {SCROLL_SHOWCASE_STEPS.map((step, i) => (
              <button
                key={step.id}
                type="button"
                role="tab"
                className="ie-ss-dot"
                aria-label={`Show ${step.label}`}
                aria-selected={slide === i}
                data-active={slide === i ? 'true' : 'false'}
                onClick={() => goToSlide(i)}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="ie-ss-desktop">
          <div
            className="ie-ss-panel"
            ref={(el) => {
              panelRefs.current[1] = el;
            }}
          >
            <div className="ie-ss-panel__blob ie-ss-panel__blob--resume" data-blob="" aria-hidden />
            <div className={SS_INNER}>
              <div className="ie-ss-row">
                <PanelCopy label={resume.label} title={resume.title} body={resume.body} />
                <div className="ie-ss-visual-slot">
                  <ResumeCard question={resume.generatedQuestion} />
                </div>
              </div>
            </div>
          </div>

          <div
            className="ie-ss-panel"
            ref={(el) => {
              panelRefs.current[2] = el;
            }}
          >
            <div className="ie-ss-panel__blob ie-ss-panel__blob--voice" data-blob="" aria-hidden />
            <div className={SS_INNER}>
              <div className="ie-ss-row ie-ss-row--reverse">
                <PanelCopy
                  label={voice.label}
                  title={voice.title}
                  body={voice.body}
                  fromRight
                  labelClassName="ie-ss-label--voice"
                />
                <div className="ie-ss-visual-slot">
                  <VoiceCard followUp={voice.followUp} />
                </div>
              </div>
            </div>
          </div>

          <div
            className="ie-ss-panel"
            ref={(el) => {
              panelRefs.current[3] = el;
            }}
          >
            <div className="ie-ss-panel__blob ie-ss-panel__blob--report" data-blob="" aria-hidden />
            <div className={SS_INNER}>
              <div className="ie-ss-row">
                <PanelCopy label={report.label} title={report.title} body={report.body} />
                <div className="ie-ss-visual-slot ie-ss-reveal ie-ss-reveal--up" data-reveal="" data-fillgroup="">
                  <ReportCard filled={reportFilled} score={reportScore} verdict={report.verdict} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      <p className="ie-lh-text-muted mx-auto max-w-5xl px-4 pb-10 text-center text-xs sm:px-6">
        {LANDING_DEMO_DISCLOSURE}
      </p>
    </section>
  );
}
