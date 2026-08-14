import { describe, expect, it } from 'vitest'
import {
  buildCoachingFeedbackViewModel,
  dedupeImprovements,
  encouragesExperienceFabrication,
  isPraiseRecapNotActionable,
  normalizeImprovementKey,
  parseStrongerExampleLines,
  sanitizeCoachingAgainstFabrication,
  strongerExampleEvidenceNote,
  titleFromMissing,
  TRUTHFUL_EXPERIENCE_COACHING,
} from './coaching-feedback-view'
import type { AnswerScore } from '@/components/interview/AnswerScoreCard'

const baseScore = (overrides?: Partial<AnswerScore>): AnswerScore => ({
  overall: 7,
  one_line_summary: 'Add a concrete result next time.',
  dimensions: {
    relevance: { score: 7, note: 'on topic' },
    content_accuracy: { score: 7, note: 'plausible' },
    communication_clarity: { score: 7, note: 'clear' },
    structure: { score: 5, note: 'thin STAR' },
    specificity: { score: 6, note: 'some detail' },
  },
  ...overrides,
})

describe('coaching-feedback-view', () => {
  it('dedupes near-identical specificity weaknesses', () => {
    const pts = dedupeImprovements([
      { title: 'Be more specific', detail: 'Add more specifics' },
      { title: 'Add more specificity' },
      { title: 'Give specific details' },
      { title: 'Show the result', detail: 'Explain what changed' },
    ])
    expect(pts.length).toBeLessThanOrEqual(2)
    expect(pts.some((p) => /result/i.test(p.title))).toBe(true)
  })

  it('keeps 1–2 meaningful missing elements without fabricating a third', () => {
    const vm = buildCoachingFeedbackViewModel({
      coaching: {
        feedback: 'Honest answer — next time ground it in a real incident.',
        restructured_example: [],
        technical_terms: [{ term: 'WebSocket', definition: 'duplex protocol' }],
        missing_elements: ['Specific example from past experience'],
      },
      score: baseScore({ one_line_summary: 'Provide a concrete past example.' }),
      displayQuestion: 'Tell me about a conflict.',
      questionType: 'behavioral',
    })
    expect(vm.improvements.length).toBeGreaterThanOrEqual(1)
    expect(vm.improvements.length).toBeLessThanOrEqual(2)
    // Key terms are not part of the view-model surface for the main card.
    expect(vm.hasStrongerExample).toBe(false)
  })

  it('parses STAR labels and does not invent Action/Result', () => {
    const sections = parseStrongerExampleLines([
      'Situation: A teammate proposed an approach I disagreed with.',
      'Task: Understand their perspective and present an alternative.',
    ])
    expect(sections).toHaveLength(2)
    expect(sections.map((s) => s.label)).toEqual(['Situation', 'Task'])
  })

  it('handles unlabeled stronger-example lines as Example sections', () => {
    const sections = parseStrongerExampleLines([
      'I prioritized by user impact and shipped the voice engine first.',
    ])
    expect(sections[0]?.label).toBe('Example')
  })

  it('handles null/empty coaching safely', () => {
    const vm = buildCoachingFeedbackViewModel({
      coaching: null,
      score: null,
      displayQuestion: 'Q',
      fallbackCoaching: 'Solid answer.',
    })
    expect(vm.improvements).toEqual([])
    expect(vm.hasStrongerExample).toBe(false)
    expect(vm.missingFromAnswer).toEqual([])
  })

  it('strips "it\'s great" / "you correctly" / "good start" praise from improvements', () => {
    for (const praise of [
      "It's great that you prioritize teamwork.",
      'You correctly identified the primary use cases.',
      'Good start.',
      'This is a good start.',
    ]) {
      expect(isPraiseRecapNotActionable(praise)).toBe(true)
      const vm = buildCoachingFeedbackViewModel({
        coaching: {
          feedback: praise,
          restructured_example: [],
          technical_terms: [],
          missing_elements: [],
        },
        score: baseScore({ overall: 9, one_line_summary: praise }),
        displayQuestion: 'Tell me about teamwork.',
        questionType: 'behavioral',
      })
      expect(vm.coachingParagraph).toBe('')
      expect(vm.improvements).toEqual([])
    }
  })

  it('keeps genuine improvement when mixed with praise', () => {
    const mixed =
      'You correctly explained caching. You could quantify the impact.'
    const vm = buildCoachingFeedbackViewModel({
      coaching: {
        feedback: mixed,
        restructured_example: [],
        technical_terms: [],
        missing_elements: [],
      },
      score: baseScore({
        overall: 8,
        one_line_summary: 'Quantify the impact.',
      }),
      displayQuestion: 'How does caching work?',
      questionType: 'technical',
    })
    expect(vm.coachingParagraph.toLowerCase()).not.toContain('you correctly')
    expect(vm.coachingParagraph).toMatch(/quantify the impact/i)
    expect(vm.improvements.some((p) => /quantify/i.test(p.title + (p.detail ?? '')))).toBe(
      true,
    )
    expect(vm.improvements.every((p) => !/you correctly/i.test(p.title + (p.detail ?? '')))).toBe(
      true,
    )
  })

  it('praise + missing_elements keeps the missing element as an improvement', () => {
    const praise = "It's great that you prioritize teamwork."
    const vm = buildCoachingFeedbackViewModel({
      coaching: {
        feedback: praise,
        restructured_example: [],
        technical_terms: [],
        missing_elements: ['Quantify the business impact'],
      },
      score: baseScore({ overall: 8.5, one_line_summary: praise }),
      displayQuestion: 'Tell me about teamwork.',
      questionType: 'behavioral',
    })
    expect(vm.coachingParagraph).toBe('')
    expect(vm.improvements.some((p) => /quantify/i.test(p.title))).toBe(true)
    expect(vm.improvements.every((p) => !/it's great|prioritize teamwork/i.test(p.title + (p.detail ?? '')))).toBe(
      true,
    )
  })

  it('does not put praise under How you could strengthen this', () => {
    const praise =
      'You clearly articulated a challenging situation and your direct contribution to its resolution.'
    const vm = buildCoachingFeedbackViewModel({
      coaching: {
        feedback: praise,
        restructured_example: [],
        technical_terms: [],
        missing_elements: [],
      },
      score: baseScore({
        overall: 10,
        one_line_summary: 'Excellent, concise, and specific answer covering all aspects of the prompt.',
      }),
      displayQuestion: 'Walk me through a specific real situation.',
      questionType: 'behavioral',
    })
    expect(vm.coachingParagraph).toBe('')
    expect(vm.improvements).toEqual([])
    expect(isPraiseRecapNotActionable(praise)).toBe(true)
    expect(vm.hasStrongerExample).toBe(false)
    expect(vm.missingFromAnswer).toEqual([])
  })

  it('uses STAR framework for behavioral and logical_flow for technical', () => {
    expect(
      buildCoachingFeedbackViewModel({
        coaching: {
          feedback: 'ok',
          restructured_example: [],
          technical_terms: [],
          missing_elements: [],
        },
        score: null,
        displayQuestion: 'Q',
        questionType: 'behavioral',
      }).framework,
    ).toBe('star')
    expect(
      buildCoachingFeedbackViewModel({
        coaching: {
          feedback: 'ok',
          restructured_example: [],
          technical_terms: [],
          missing_elements: [],
        },
        score: null,
        displayQuestion: 'Q',
        questionType: 'technical',
      }).framework,
    ).toBe('logical_flow')
  })

  it('normalizeImprovementKey collapses specificity synonyms', () => {
    expect(normalizeImprovementKey('Be more specific')).toBe(
      normalizeImprovementKey('Add more specificity'),
    )
  })

  it('titleFromMissing keeps short strings intact', () => {
    expect(titleFromMissing('show the result')).toBe('Show the result')
  })

  it('does not rewrite coaching that already forbids invention', () => {
    const honest = 'Do not invent a conflict. Use a real example or say you have none.'
    expect(encouragesExperienceFabrication(honest)).toBe(false)
    expect(sanitizeCoachingAgainstFabrication(honest)).toBe(honest)
  })

  it('rewrites coaching that tells the candidate to manufacture a STAR story', () => {
    const unsafe =
      'Address the prompt directly by preparing a STAR story about a disagreement, even if it requires recalling a different project or a minor conflict.'
    expect(encouragesExperienceFabrication(unsafe)).toBe(true)
    expect(sanitizeCoachingAgainstFabrication(unsafe)).toBe(TRUTHFUL_EXPERIENCE_COACHING)

    const vm = buildCoachingFeedbackViewModel({
      coaching: {
        feedback: unsafe,
        restructured_example: [],
        technical_terms: [],
        missing_elements: [unsafe],
      },
      score: baseScore({ one_line_summary: unsafe }),
      displayQuestion: 'Tell me about a disagreement with a teammate.',
      questionType: 'behavioral',
    })
    expect(vm.coachingParagraph).toBe(TRUTHFUL_EXPERIENCE_COACHING)
    expect(vm.missingFromAnswer.every((m) => m === TRUTHFUL_EXPERIENCE_COACHING)).toBe(true)
    expect(vm.coachingParagraph).not.toMatch(/even if it requires/i)
  })

  it('stronger-example note appears when STAR sections are incomplete; not when all four exist', () => {
    const partial = parseStrongerExampleLines([
      'Situation: Organic acquisition was a bottleneck.',
      'Action: I built programmatic SEO pages.',
    ])
    expect(strongerExampleEvidenceNote('star', partial)).toMatch(/don't invent missing STAR/i)

    const complete = parseStrongerExampleLines([
      'Situation: Organic acquisition was a bottleneck.',
      'Task: I owned the acquisition funnel.',
      'Action: I built programmatic SEO pages.',
      'Result: Organic clicks grew to 1,000 a month.',
    ])
    expect(strongerExampleEvidenceNote('star', complete)).toBeNull()

    const vm = buildCoachingFeedbackViewModel({
      coaching: {
        feedback: 'Ground the next answer in a real incident.',
        restructured_example: [
          'Situation: Organic acquisition was a bottleneck.',
          'Action: I built programmatic SEO pages.',
        ],
        technical_terms: [],
        missing_elements: [],
      },
      score: baseScore(),
      displayQuestion: 'Tell me about a challenge.',
      questionType: 'behavioral',
    })
    expect(vm.hasStrongerExample).toBe(true)
    expect(vm.strongerExample.map((s) => s.label)).toEqual(['Situation', 'Action'])
    expect(vm.strongerExampleNote).toMatch(/don't invent missing STAR/i)
  })

  it('high score + praise one_line_summary + no missing_elements → not an improvement', () => {
    const praise =
      'The answer is comprehensive and accurate, covering all aspects of the question with good examples.'
    expect(isPraiseRecapNotActionable(praise)).toBe(true)
    const vm = buildCoachingFeedbackViewModel({
      coaching: {
        feedback: 'Clear, complete answer.',
        restructured_example: [],
        technical_terms: [],
        missing_elements: [],
      },
      score: baseScore({
        overall: 9.1,
        one_line_summary: praise,
        dimensions: {
          relevance: { score: 9, note: 'on topic' },
          content_accuracy: { score: 9, note: 'sound' },
          communication_clarity: { score: 9, note: 'clear' },
          structure: { score: 9, note: 'complete arc' },
          specificity: { score: 9, note: 'named work' },
        },
      }),
      displayQuestion: 'Explain REST vs GraphQL.',
      questionType: 'technical',
    })
    expect(vm.improvements.some((p) => /comprehensive|accurate|covers all/i.test(p.title + (p.detail ?? '')))).toBe(
      false,
    )
    expect(vm.coachingParagraph).toBe('')
    expect(vm.quickTip).toBe(praise)
  })

  it('high score + actionable one_line_summary + no missing_elements → improvement remains', () => {
    const vm = buildCoachingFeedbackViewModel({
      coaching: {
        feedback: 'Strong answer.',
        restructured_example: [],
        technical_terms: [],
        missing_elements: [],
      },
      score: baseScore({
        overall: 8.8,
        one_line_summary: 'To make it more concrete, quantify the outcome.',
      }),
      displayQuestion: 'Tell me about a deadline.',
      questionType: 'behavioral',
    })
    expect(vm.improvements.length).toBeGreaterThanOrEqual(1)
    expect(vm.improvements.some((p) => /quantify/i.test(p.title + (p.detail ?? '')))).toBe(true)
    expect(vm.quickTip).toMatch(/quantify/i)
  })

  it('missing_elements remain improvements even when summary is praise', () => {
    const praise = 'You clearly explained the approach with good examples.'
    const vm = buildCoachingFeedbackViewModel({
      coaching: {
        feedback: 'Honest answer — next time ground it in a real incident.',
        restructured_example: [],
        technical_terms: [],
        missing_elements: ['Specific example from past experience'],
      },
      score: baseScore({ overall: 9.4, one_line_summary: praise }),
      displayQuestion: 'Tell me about a conflict.',
      questionType: 'behavioral',
    })
    expect(vm.missingFromAnswer).toEqual(['Specific example from past experience'])
    expect(vm.improvements.some((p) => /specific example/i.test(p.title))).toBe(true)
    expect(vm.improvements.every((p) => !/clearly explained/i.test(p.title + (p.detail ?? '')))).toBe(true)
    expect(vm.quickTip).toBe(praise)
  })

  it('low/medium score still surfaces an actionable summary as an improvement', () => {
    const vm = buildCoachingFeedbackViewModel({
      coaching: {
        feedback: 'Good start.',
        restructured_example: [],
        technical_terms: [],
        missing_elements: [],
      },
      score: baseScore({
        overall: 6.5,
        one_line_summary: 'Add a concrete result next time.',
      }),
      displayQuestion: 'Tell me about a challenge.',
      questionType: 'behavioral',
    })
    expect(vm.improvements.length).toBeGreaterThanOrEqual(1)
    expect(vm.improvements.some((p) => /concrete result/i.test(p.title + (p.detail ?? '')))).toBe(true)
  })
})
