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
      </div>
    </div>
  );
}

export default LandingHeroSimulatorShell;
