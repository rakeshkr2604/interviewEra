import {
  TCS_APPLY_STEPS,
  TCS_ELIGIBILITY_CHECKLIST,
  TCS_FOUR_STAGE_STEPS,
  TCS_PACKAGE_COMPARISON_ROWS,
  TCS_RESUME_BEFORE_AFTER,
  TCS_30_DAY_ROADMAP,
} from '@/lib/seo/programmatic/tcs-hub'

const panelStyle = {
  borderColor: 'var(--card-border)',
  background: 'color-mix(in srgb, var(--card-bg) 94%, transparent)',
  boxShadow: 'var(--card-shadow)',
} as const

/** FY26 vs FY27 fresher intake comparison — original icon diagram, no brand marks. */
export function TcsIntakeComparisonVisual() {
  return (
    <figure className="ie-tcs-guide-visual" aria-labelledby="tcs-intake-visual-title">
      <div className="ie-tcs-guide-visual__inner" style={panelStyle}>
        <p id="tcs-intake-visual-title" className="ie-tcs-guide-visual__title">
          Fresher intake context (illustrative)
        </p>
        <div className="ie-tcs-intake" role="img" aria-label="FY26 about 44,000 seats versus FY27 about 25,000 seats">
          <div className="ie-tcs-intake__col">
            <span className="ie-tcs-intake__label">FY26 onboarded</span>
            <div className="ie-tcs-intake__bar ie-tcs-intake__bar--fy26" style={{ height: '88%' }}>
              <span>~44,000</span>
            </div>
          </div>
          <div className="ie-tcs-intake__col">
            <span className="ie-tcs-intake__label">FY27 trending</span>
            <div className="ie-tcs-intake__bar ie-tcs-intake__bar--fy27" style={{ height: '50%' }}>
              <span>~25,000</span>
            </div>
          </div>
        </div>
        <p className="ie-tcs-guide-visual__note">
          Higher competition per seat — apply earlier; figures are directional from public hiring commentary.
        </p>
      </div>
      <figcaption className="ie-tcs-guide-visual__caption">
        TCS FY26 vs FY27 fresher intake comparison timeline
      </figcaption>
    </figure>
  )
}

/** Eligibility checklist graphic — original checkmark icons. */
export function TcsEligibilityChecklistVisual() {
  return (
    <figure className="ie-tcs-guide-visual" aria-labelledby="tcs-eligibility-visual-title">
      <div className="ie-tcs-guide-visual__inner" style={panelStyle}>
        <p id="tcs-eligibility-visual-title" className="ie-tcs-guide-visual__title">
          Eligibility checklist
        </p>
        <ul className="ie-tcs-check-grid">
          {TCS_ELIGIBILITY_CHECKLIST.map((item) => (
            <li key={item} className="ie-tcs-check-grid__item">
              <span className="ie-tcs-check-grid__mark" aria-hidden>
                ✓
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
      <figcaption className="ie-tcs-guide-visual__caption">
        TCS eligibility criteria checklist 2026
      </figcaption>
    </figure>
  )
}

/** Ninja / Digital / Prime pyramid — original tier diagram. */
export function TcsTrackPyramidVisual() {
  const tiers = [
    { name: 'Prime', ctc: '₹9.09–12.26 LPA', className: 'ie-tcs-pyramid__tier--prime' },
    { name: 'Digital', ctc: '₹7.0–8.0 LPA', className: 'ie-tcs-pyramid__tier--digital' },
    { name: 'Ninja', ctc: '₹3.36–4.5 LPA*', className: 'ie-tcs-pyramid__tier--ninja' },
  ] as const

  return (
    <figure className="ie-tcs-guide-visual" aria-labelledby="tcs-pyramid-visual-title">
      <div className="ie-tcs-guide-visual__inner" style={panelStyle}>
        <p id="tcs-pyramid-visual-title" className="ie-tcs-guide-visual__title">
          One NQT → three tracks
        </p>
        <ol className="ie-tcs-pyramid">
          {tiers.map((tier) => (
            <li key={tier.name} className={`ie-tcs-pyramid__tier ${tier.className}`}>
              <strong>{tier.name}</strong>
              <span>{tier.ctc}</span>
            </li>
          ))}
        </ol>
        <p className="ie-tcs-guide-visual__note">*Ninja CTC is candidate-reported — confirm on offer letter.</p>
      </div>
      <figcaption className="ie-tcs-guide-visual__caption">
        TCS Ninja Digital Prime salary comparison pyramid
      </figcaption>
    </figure>
  )
}

/** Salary bar chart — original CSS bars. */
export function TcsSalaryBarVisual() {
  const bars = [
    { name: 'Ninja', pct: 35, accent: '#38bdf8', value: TCS_PACKAGE_COMPARISON_ROWS[0][1] },
    { name: 'Digital', pct: 68, accent: '#22c55e', value: TCS_PACKAGE_COMPARISON_ROWS[1][1] },
    { name: 'Prime', pct: 100, accent: '#f59e0b', value: TCS_PACKAGE_COMPARISON_ROWS[2][1] },
  ] as const

  return (
    <figure className="ie-tcs-guide-visual" aria-labelledby="tcs-salary-visual-title">
      <div className="ie-tcs-guide-visual__inner" style={panelStyle}>
        <p id="tcs-salary-visual-title" className="ie-tcs-guide-visual__title">
          Fresher CTC bands (illustrative)
        </p>
        <ul className="ie-tcs-salary-bars">
          {bars.map((bar) => (
            <li key={bar.name} className="ie-tcs-salary-bars__row">
              <span className="ie-tcs-salary-bars__name">{bar.name}</span>
              <div className="ie-tcs-salary-bars__track">
                <div
                  className="ie-tcs-salary-bars__fill"
                  style={{ width: `${bar.pct}%`, background: bar.accent }}
                />
              </div>
              <span className="ie-tcs-salary-bars__value">{bar.value}</span>
            </li>
          ))}
        </ul>
      </div>
      <figcaption className="ie-tcs-guide-visual__caption">
        TCS fresher salary comparison bar chart 2026
      </figcaption>
    </figure>
  )
}

/** NQT Foundation → Advanced flowchart. */
export function TcsNqtFlowVisual() {
  return (
    <figure className="ie-tcs-guide-visual" aria-labelledby="tcs-nqt-flow-title">
      <div className="ie-tcs-guide-visual__inner" style={panelStyle}>
        <p id="tcs-nqt-flow-title" className="ie-tcs-guide-visual__title">
          NQT exam pattern flow
        </p>
        <ol className="ie-tcs-nqt-flow">
          <li className="ie-tcs-nqt-flow__box">
            <strong>Foundation</strong>
            <span>Numerical · Verbal · Reasoning</span>
          </li>
          <li className="ie-tcs-nqt-flow__arrow" aria-hidden>
            →
          </li>
          <li className="ie-tcs-nqt-flow__box ie-tcs-nqt-flow__box--adv">
            <strong>Advanced</strong>
            <span>Harder quant/logic · Coding (×2)</span>
          </li>
          <li className="ie-tcs-nqt-flow__arrow" aria-hidden>
            →
          </li>
          <li className="ie-tcs-nqt-flow__box ie-tcs-nqt-flow__box--track">
            <strong>Track sort</strong>
            <span>Ninja · Digital · Prime</span>
          </li>
        </ol>
      </div>
      <figcaption className="ie-tcs-guide-visual__caption">
        TCS NQT exam pattern Foundation Advanced flowchart
      </figcaption>
    </figure>
  )
}

/** Four-stage selection process. */
export function TcsFourStageProcessVisual() {
  return (
    <figure className="ie-tcs-guide-visual" aria-labelledby="tcs-four-stage-title">
      <div className="ie-tcs-guide-visual__inner" style={panelStyle}>
        <p id="tcs-four-stage-title" className="ie-tcs-guide-visual__title">
          Selection process — four stages
        </p>
        <ol className="ie-tcs-four-stage">
          {TCS_FOUR_STAGE_STEPS.map((step, index) => (
            <li key={step.label} className="ie-tcs-four-stage__item">
              <span className="ie-tcs-four-stage__num" aria-hidden>
                {index + 1}
              </span>
              <strong>{step.label}</strong>
              <span>{step.detail}</span>
            </li>
          ))}
        </ol>
      </div>
      <figcaption className="ie-tcs-guide-visual__caption">
        TCS selection process four stage flow diagram
      </figcaption>
    </figure>
  )
}

/** Technical vs HR split panel. */
export function TcsTechHrSplitVisual() {
  return (
    <figure className="ie-tcs-guide-visual" aria-labelledby="tcs-tech-hr-title">
      <div className="ie-tcs-guide-visual__inner" style={panelStyle}>
        <p id="tcs-tech-hr-title" className="ie-tcs-guide-visual__title">
          What each interview round probes
        </p>
        <div className="ie-tcs-split">
          <section className="ie-tcs-split__panel ie-tcs-split__panel--tech">
            <h3 className="ie-tcs-split__h">Technical</h3>
            <ul>
              <li>OOPs · DBMS · OS · CN</li>
              <li>Language + live coding</li>
              <li>Resume / AI-data projects</li>
            </ul>
          </section>
          <section className="ie-tcs-split__panel ie-tcs-split__panel--hr">
            <h3 className="ie-tcs-split__h">Managerial / HR</h3>
            <ul>
              <li>Why this company?</li>
              <li>Bond · relocation</li>
              <li>STAR behavioural stories</li>
            </ul>
          </section>
        </div>
      </div>
      <figcaption className="ie-tcs-guide-visual__caption">
        TCS technical and HR interview questions split panel
      </figcaption>
    </figure>
  )
}

/** 30-day roadmap infographic. */
export function TcsRoadmapInfographicVisual() {
  return (
    <figure className="ie-tcs-guide-visual" aria-labelledby="tcs-roadmap-infographic-title">
      <div className="ie-tcs-guide-visual__inner" style={panelStyle}>
        <p id="tcs-roadmap-infographic-title" className="ie-tcs-guide-visual__title">
          30-day preparation arc
        </p>
        <ol className="ie-tcs-roadmap-strip">
          {TCS_30_DAY_ROADMAP.map((week, index) => (
            <li key={week.week} className="ie-tcs-roadmap-strip__item">
              <span className="ie-tcs-roadmap-strip__badge" aria-hidden>
                W{index + 1}
              </span>
              <strong>{week.focus}</strong>
            </li>
          ))}
        </ol>
      </div>
      <figcaption className="ie-tcs-guide-visual__caption">
        30 day TCS NQT preparation roadmap infographic
      </figcaption>
    </figure>
  )
}

/** Resume before/after comparison. */
export function TcsResumeBeforeAfterVisual() {
  const sample = TCS_RESUME_BEFORE_AFTER[0]
  return (
    <figure className="ie-tcs-guide-visual" aria-labelledby="tcs-resume-visual-title">
      <div className="ie-tcs-guide-visual__inner" style={panelStyle}>
        <p id="tcs-resume-visual-title" className="ie-tcs-guide-visual__title">
          Resume bullet — weak vs strong
        </p>
        <div className="ie-tcs-resume-compare">
          <div className="ie-tcs-resume-compare__col ie-tcs-resume-compare__col--weak">
            <span className="ie-tcs-resume-compare__label">Before</span>
            <p>{sample.weak}</p>
          </div>
          <div className="ie-tcs-resume-compare__col ie-tcs-resume-compare__col--strong">
            <span className="ie-tcs-resume-compare__label">After</span>
            <p>{sample.strong}</p>
          </div>
        </div>
      </div>
      <figcaption className="ie-tcs-guide-visual__caption">
        ATS friendly resume bullet before after comparison
      </figcaption>
    </figure>
  )
}

/** Application step flow (first 5 steps summarized). */
export function TcsApplyStepsVisual() {
  const steps = TCS_APPLY_STEPS.slice(0, 5)
  return (
    <figure className="ie-tcs-guide-visual" aria-labelledby="tcs-apply-visual-title">
      <div className="ie-tcs-guide-visual__inner" style={panelStyle}>
        <p id="tcs-apply-visual-title" className="ie-tcs-guide-visual__title">
          Application flow (start)
        </p>
        <ol className="ie-tcs-apply-flow">
          {steps.map((step, index) => (
            <li key={step} className="ie-tcs-apply-flow__item">
              <span className="ie-tcs-apply-flow__num" aria-hidden>
                {index + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
        <p className="ie-tcs-guide-visual__note">Full 10-step checklist appears in the How to Apply section.</p>
      </div>
      <figcaption className="ie-tcs-guide-visual__caption">
        TCS application process step by step flow
      </figcaption>
    </figure>
  )
}
