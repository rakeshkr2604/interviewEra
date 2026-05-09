import { T } from '@/components/landing/landing-home-tokens';
import { HeroScorecardCountUp } from '@/components/landing/HeroScorecardCountUp';
import { ScoringBarsIsland } from '@/components/landing/ScoringBarsIsland';

function LivePulse() {
  return (
    <span
      className="ie-live-pulse"
      style={{
        display: 'inline-block',
        width: '6px',
        height: '6px',
        borderRadius: '50%',
        background: T.ok,
        flexShrink: 0,
      }}
    />
  );
}

function CursorBlink() {
  return (
    <span
      className="ie-cursor-blink"
      style={{
        display: 'inline-block',
        width: '2px',
        height: '13px',
        background: T.acc,
        marginLeft: '2px',
        verticalAlign: 'middle',
      }}
    />
  );
}

/** Above-the-fold mock scoring UI — server-rendered shell; bars/count animate via client islands. */
export default function LandingHeroScorecard() {
  return (
    <div
      style={{
        background: T.card,
        border: `1px solid ${T.bord2}`,
        borderRadius: '20px',
        overflow: 'hidden',
        boxShadow: T.scoreShadow,
      }}
    >
      <div
        style={{
          background: T.bg2,
          borderBottom: `1px solid ${T.bord}`,
          padding: '12px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', gap: '5px' }}>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: T.bord2,
                display: 'block',
              }}
            />
          ))}
        </div>
        <div
          style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', fontWeight: 600, color: T.ok }}
        >
          <LivePulse /> Scoring live
        </div>
      </div>

      <div style={{ padding: '18px 20px' }}>
        <div
          style={{
            fontSize: '11px',
            fontWeight: 700,
            color: T.text3,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            marginBottom: '8px',
          }}
        >
          Question 2 of 5 · Technical
        </div>
        <div
          style={{
            background: T.bg2,
            border: `1px solid ${T.bord}`,
            borderRadius: '10px',
            padding: '13px 15px',
            fontSize: '14px',
            fontWeight: 600,
            color: T.text,
            lineHeight: 1.5,
            marginBottom: '16px',
            fontFamily: 'var(--font-bricolage), ui-sans-serif, system-ui, sans-serif',
          }}
        >
          &ldquo;Walk me through the payment API failure you handled in your final-year project.&rdquo;
        </div>
        <div
          style={{
            fontSize: '10.5px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: T.text3,
            marginBottom: '6px',
          }}
        >
          Your answer
        </div>
        <div
          style={{
            background: T.ansBg,
            border: `1px solid ${T.bord2}`,
            borderRadius: '10px',
            padding: '12px 14px',
            fontSize: '13.5px',
            color: T.text2,
            lineHeight: 1.65,
            marginBottom: '16px',
            minHeight: '56px',
          }}
        >
          In Q4 2023, our payment service was dropping ~8% of transactions silently. I owned the backend debug — traced a
          race condition in the retry worker using logs, added idempotent keys and exponential backoff...
          <CursorBlink />
        </div>
        <div
          style={{
            fontSize: '11px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: T.text3,
            marginBottom: '10px',
          }}
        >
          AI scoring in progress
        </div>
        <ScoringBarsIsland />
      </div>

      <div
        style={{
          borderTop: `1px solid ${T.bord}`,
          padding: '12px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span style={{ fontSize: '12px', color: T.text3 }}>Session average</span>
        <div style={{ fontFamily: 'var(--font-jetbrains), ui-monospace, monospace', fontWeight: 700 }}>
          <span style={{ fontSize: '22px', color: T.acc }}>
            <HeroScorecardCountUp to={7.6} decimals={1} duration={1.4} delay={0.5} />
          </span>
          <span style={{ fontSize: '13px', color: T.text3, marginLeft: '4px' }}>/ 10</span>
        </div>
      </div>
    </div>
  );
}
