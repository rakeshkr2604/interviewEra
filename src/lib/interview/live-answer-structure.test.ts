import { describe, expect, it } from 'vitest'
import {
  detectLiveAnswerStructure,
  presentLiveAnswerStructure,
  resolveLiveAnswerFramework,
  type LiveAnswerStructure,
} from './live-answer-structure'

function statusOf(structure: LiveAnswerStructure, id: string) {
  return structure.sections.find((s) => s.id === id)?.status
}

describe('resolveLiveAnswerFramework', () => {
  it('SCRIPT_H → star; SCRIPT_T → logical_flow', () => {
    expect(
      resolveLiveAnswerFramework({ scriptType: 'SCRIPT_H', questionType: null }),
    ).toBe('star')
    expect(
      resolveLiveAnswerFramework({ scriptType: 'SCRIPT_T', questionType: null }),
    ).toBe('logical_flow')
  })

  it('SCRIPT_M uses the per-turn question_type tag', () => {
    expect(
      resolveLiveAnswerFramework({ scriptType: 'SCRIPT_M', questionType: 'behavioral' }),
    ).toBe('star')
    expect(
      resolveLiveAnswerFramework({ scriptType: 'SCRIPT_M', questionType: 'technical' }),
    ).toBe('logical_flow')
  })

  it('14: unknown framework returns null (no strip)', () => {
    expect(
      resolveLiveAnswerFramework({ scriptType: 'SCRIPT_M', questionType: null }),
    ).toBeNull()
    expect(resolveLiveAnswerFramework({ scriptType: null, questionType: null })).toBeNull()
  })
})

describe('detectLiveAnswerStructure — STAR', () => {
  it('1: empty transcript → everything not_detected_yet', () => {
    const out = detectLiveAnswerStructure('', 'star')
    expect(out.sections).toHaveLength(4)
    for (const s of out.sections) expect(s.status).toBe('not_detected_yet')
  })

  it('2: never exposes a "missing"/"failed" status', () => {
    const out = detectLiveAnswerStructure('Some words here today.', 'star')
    for (const s of out.sections) {
      expect(['detected', 'not_detected_yet']).toContain(s.status)
    }
  })

  it('3: Situation detected from context cues', () => {
    const out = detectLiveAnswerStructure(
      'While building InterviewEra, organic acquisition became a bottleneck for us.',
      'star',
    )
    expect(statusOf(out, 'situation')).toBe('detected')
  })

  it('4: Action detected from first-person build verbs', () => {
    const out = detectLiveAnswerStructure(
      'I built 250 programmatic SEO pages for the site.',
      'star',
    )
    expect(statusOf(out, 'action')).toBe('detected')
  })

  it('5: Result detected from outcome cue', () => {
    const out = detectLiveAnswerStructure(
      'That generated around one thousand organic clicks a month.',
      'star',
    )
    expect(statusOf(out, 'result')).toBe('detected')
  })

  it('6: Task detected from responsibility cues', () => {
    const out = detectLiveAnswerStructure(
      'I was responsible for the entire acquisition funnel there.',
      'star',
    )
    expect(statusOf(out, 'task')).toBe('detected')
  })

  it('7: number in Situation does NOT automatically trigger Result', () => {
    const out = detectLiveAnswerStructure(
      'I was working on a project with 150 users at that time.',
      'star',
    )
    expect(statusOf(out, 'result')).toBe('not_detected_yet')
    expect(statusOf(out, 'situation')).toBe('detected')
  })

  it('8: result cue + metric triggers Result', () => {
    const out = detectLiveAnswerStructure(
      'It increased organic clicks to 1,000 per week.',
      'star',
    )
    expect(statusOf(out, 'result')).toBe('detected')
  })

  it('9: monotonic — a detected section stays detected via previous', () => {
    const first = detectLiveAnswerStructure(
      'I built the resume parser for the platform myself.',
      'star',
    )
    expect(statusOf(first, 'action')).toBe('detected')

    // Recompute on text that alone would NOT match Action.
    const second = detectLiveAnswerStructure(
      'The team was very supportive throughout that period.',
      'star',
      first,
    )
    expect(statusOf(second, 'action')).toBe('detected')
  })

  it('9b: previous from a different framework is ignored', () => {
    const star = detectLiveAnswerStructure(
      'I built the resume parser for the platform myself.',
      'star',
    )
    const flow = detectLiveAnswerStructure('Short text only.', 'logical_flow', star)
    for (const s of flow.sections) expect(s.status).toBe('not_detected_yet')
  })

  it('10: punctuation/case variations still match', () => {
    const out = detectLiveAnswerStructure(
      'WHILE working on my PROJECT, I Implemented the caching layer!! It REDUCED load times a lot.',
      'star',
    )
    expect(statusOf(out, 'situation')).toBe('detected')
    expect(statusOf(out, 'action')).toBe('detected')
    expect(statusOf(out, 'result')).toBe('detected')
  })

  it('11: short cut-off fragment does not trigger detection', () => {
    // "I built" alone is 2 words — below the sentence-evidence threshold.
    expect(statusOf(detectLiveAnswerStructure('I built', 'star'), 'action')).toBe(
      'not_detected_yet',
    )
    expect(statusOf(detectLiveAnswerStructure('the result', 'star'), 'result')).toBe(
      'not_detected_yet',
    )
  })
})

describe('detectLiveAnswerStructure — logical_flow', () => {
  it('12: technical answer maps to Problem/Approach/Reasoning/Conclusion', () => {
    const out = detectLiveAnswerStructure(
      'The main problem was slow database queries under load. ' +
        'I used a composite index and a read replica for the hot path. ' +
        'I chose indexing over caching because the data changes frequently. ' +
        'Ultimately this reduced query time by ninety percent.',
      'logical_flow',
    )
    expect(out.framework).toBe('logical_flow')
    expect(statusOf(out, 'problem')).toBe('detected')
    expect(statusOf(out, 'approach')).toBe('detected')
    expect(statusOf(out, 'reasoning')).toBe('detected')
    expect(statusOf(out, 'conclusion')).toBe('detected')
    expect(out.sections.map((s) => s.label)).toEqual([
      'Problem',
      'Approach',
      'Reasoning / trade-offs',
      'Conclusion',
    ])
  })

  it('13: mixed-mode behavioral tag produces STAR labels', () => {
    const framework = resolveLiveAnswerFramework({
      scriptType: 'SCRIPT_M',
      questionType: 'behavioral',
    })
    expect(framework).toBe('star')
    const out = detectLiveAnswerStructure('During my internship we shipped weekly.', framework!)
    expect(out.sections.map((s) => s.label)).toEqual([
      'Situation',
      'Task',
      'Action',
      'Result',
    ])
  })
})

function presentationOf(structure: LiveAnswerStructure, id: string) {
  return presentLiveAnswerStructure(structure).find((s) => s.id === id)
}

describe('presentLiveAnswerStructure — sequential STAR', () => {
  it('Result cue before Action is detected internally but not shown completed', () => {
    const detected = detectLiveAnswerStructure(
      'That generated around one thousand organic clicks a month.',
      'star',
    )
    expect(statusOf(detected, 'result')).toBe('detected')
    expect(statusOf(detected, 'action')).toBe('not_detected_yet')

    const result = presentationOf(detected, 'result')
    const situation = presentationOf(detected, 'situation')
    expect(result?.detected).toBe(true)
    expect(result?.presentation).toBe('upcoming')
    expect(situation?.presentation).toBe('next')
    expect(presentationOf(detected, 'action')?.presentation).toBe('upcoming')
  })

  it('Action cue before Task is detected internally but not shown completed', () => {
    const detected = detectLiveAnswerStructure(
      'While building InterviewEra I built 250 programmatic SEO pages for the site.',
      'star',
    )
    expect(statusOf(detected, 'situation')).toBe('detected')
    expect(statusOf(detected, 'action')).toBe('detected')
    expect(statusOf(detected, 'task')).toBe('not_detected_yet')

    expect(presentationOf(detected, 'situation')?.presentation).toBe('completed')
    expect(presentationOf(detected, 'task')?.presentation).toBe('next')
    expect(presentationOf(detected, 'action')?.detected).toBe(true)
    expect(presentationOf(detected, 'action')?.presentation).toBe('upcoming')
  })

  it('Situation + Result only → Task is next; Result stays uncompleted', () => {
    const detected = detectLiveAnswerStructure(
      'While building InterviewEra, organic acquisition became a bottleneck. That generated around one thousand organic clicks a month.',
      'star',
    )
    expect(statusOf(detected, 'situation')).toBe('detected')
    expect(statusOf(detected, 'result')).toBe('detected')
    expect(statusOf(detected, 'task')).toBe('not_detected_yet')
    expect(statusOf(detected, 'action')).toBe('not_detected_yet')

    const presented = presentLiveAnswerStructure(detected)
    expect(presented.map((s) => [s.id, s.presentation])).toEqual([
      ['situation', 'completed'],
      ['task', 'next'],
      ['action', 'upcoming'],
      ['result', 'upcoming'],
    ])
    expect(presented.find((s) => s.id === 'result')?.detected).toBe(true)
  })

  it('normal Situation → Task → Action → Result progression lights up in order', () => {
    const s = detectLiveAnswerStructure(
      'While building InterviewEra, organic acquisition became a bottleneck for us.',
      'star',
    )
    expect(presentLiveAnswerStructure(s).map((x) => x.presentation)).toEqual([
      'completed',
      'next',
      'upcoming',
      'upcoming',
    ])

    const st = detectLiveAnswerStructure(
      'While building InterviewEra, organic acquisition became a bottleneck. I was responsible for the entire acquisition funnel there.',
      'star',
    )
    expect(presentLiveAnswerStructure(st).map((x) => x.presentation)).toEqual([
      'completed',
      'completed',
      'next',
      'upcoming',
    ])

    const sta = detectLiveAnswerStructure(
      'While building InterviewEra, organic acquisition became a bottleneck. I was responsible for the entire acquisition funnel there. I built 250 programmatic SEO pages for the site.',
      'star',
    )
    expect(presentLiveAnswerStructure(sta).map((x) => x.presentation)).toEqual([
      'completed',
      'completed',
      'completed',
      'next',
    ])

    const star = detectLiveAnswerStructure(
      'While building InterviewEra, organic acquisition became a bottleneck. I was responsible for the entire acquisition funnel there. I built 250 programmatic SEO pages for the site. That generated around one thousand organic clicks a month.',
      'star',
    )
    expect(presentLiveAnswerStructure(star).map((x) => x.presentation)).toEqual([
      'completed',
      'completed',
      'completed',
      'completed',
    ])
  })

  it('never exposes missing/failed/complete presentation states', () => {
    const star = detectLiveAnswerStructure(
      'While building InterviewEra, organic acquisition became a bottleneck. That generated around one thousand organic clicks a month.',
      'star',
    )
    for (const s of presentLiveAnswerStructure(star)) {
      expect(['completed', 'next', 'upcoming']).toContain(s.presentation)
    }
  })

  it('monotonic internal detection remains intact across presentation', () => {
    const first = detectLiveAnswerStructure(
      'That generated around one thousand organic clicks a month.',
      'star',
    )
    expect(statusOf(first, 'result')).toBe('detected')
    expect(presentationOf(first, 'result')?.presentation).toBe('upcoming')

    const later = detectLiveAnswerStructure(
      'The team was very supportive throughout that period.',
      'star',
      first,
    )
    expect(statusOf(later, 'result')).toBe('detected')
    expect(presentationOf(later, 'result')?.detected).toBe(true)
    expect(presentationOf(later, 'result')?.presentation).toBe('upcoming')
  })
})

describe('presentLiveAnswerStructure — sequential logical_flow', () => {
  it('SCRIPT_T progression: Conclusion early does not complete before Problem', () => {
    const detected = detectLiveAnswerStructure(
      'Ultimately this reduced query time by ninety percent under load.',
      'logical_flow',
    )
    expect(statusOf(detected, 'conclusion')).toBe('detected')
    expect(presentationOf(detected, 'problem')?.presentation).toBe('next')
    expect(presentationOf(detected, 'conclusion')?.detected).toBe(true)
    expect(presentationOf(detected, 'conclusion')?.presentation).toBe('upcoming')
  })

  it('SCRIPT_T sequential Problem → Approach → Reasoning → Conclusion', () => {
    const out = detectLiveAnswerStructure(
      'The main problem was slow database queries under load. ' +
        'I used a composite index and a read replica for the hot path. ' +
        'I chose indexing over caching because the data changes frequently. ' +
        'Ultimately this reduced query time by ninety percent.',
      'logical_flow',
    )
    expect(presentLiveAnswerStructure(out).map((s) => s.presentation)).toEqual([
      'completed',
      'completed',
      'completed',
      'completed',
    ])
  })
})
