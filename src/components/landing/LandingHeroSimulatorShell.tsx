import './LandingHeroSimulatorShell.css';
import { LandingHeroSimulatorPoster } from '@/components/landing/LandingHeroSimulatorPoster';

/**
 * Static first-paint shell for the hero simulator.
 * Matches the live card footprint (poster + chrome) so dynamic() loading never CLS-spins.
 * No video, no turn engine, no timers.
 *
 * Loop 21: shell CSS only — full LandingHeroSimulator.css loads with the deferred island.
 */
export function LandingHeroSimulatorShell() {
  return (
    <div
      className="sim-host"
      role="img"
      aria-label="Animated Sample Session Mock Interview demo"
    >
      <div className="sim" aria-hidden="true">
        <div className="sim-chrome">
          <div className="sim-dots">
            <span />
            <span />
            <span />
          </div>
          <div className="sim-url">interviewera.com/session/sample</div>
          <div className="sim-chrome-right">⌘ K</div>
        </div>

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
              <div className="sim-meta-val">1 / 4</div>
            </div>
            <div className="sim-meta-block">
              <div className="sim-meta-label">Time left</div>
              <div className="sim-meta-val accent">01:30</div>
            </div>
          </div>
        </div>

        <div className="sim-stage">
          <div className="sim-left">
            <div className="sim-video-tile">
              <LandingHeroSimulatorPoster />
              <div className="sim-tile-name">
                <span className="name">Meera · HR round</span>
              </div>
            </div>
          </div>
          <div className="sim-right">
            <div className="sim-conv" />
          </div>
        </div>

        {/* Footer must match the live card height or the hero grows when the island mounts (desktop CLS). */}
        <div className="sim-foot sim-foot--static">
          <div className="sim-foot-left">
            <div className="sim-mic muted">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M8 1.5a2 2 0 00-2 2v5a2 2 0 104 0v-5a2 2 0 00-2-2z" stroke="currentColor" strokeWidth="1.4" />
                <path d="M3.5 7.5v1a4.5 4.5 0 009 0v-1M8 13v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </div>
            <span className="sim-foot-status">AI is reading the question…</span>
          </div>
          <div className="sim-foot-right">
            <span className="sim-prev-btn disabled">
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                <path d="M7 9L3 6l4-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Previous
            </span>
            <span className="sim-next-btn primary disabled">
              <span>Next question</span>
              <span className="arrow">→</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LandingHeroSimulatorShell;
