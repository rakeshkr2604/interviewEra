import { describe, expect, it } from 'vitest'
import {
  followUpAbandonsParentTopic,
  followUpConflictsWithParentType,
  isAnaphoricFollowUpProbe,
  questionsAreEquivalent,
  sameQuestionText,
  scriptMFollowUpIsDuplicateOf,
  speechContainsQuestionMark,
} from './follow-up-guards'

const SORTING_PARENT =
  'Two sorting algorithms both have O(n log n) time complexity. Can one still be meaningfully faster than the other in practice?'

const GRAPHQL_ANSWER =
  'REST uses endpoints and GraphQL lets you request the data you need. GraphQL is more flexible.'

describe('followUpAbandonsParentTopic', () => {
  it('rejects stack/heap follow-up after an off-topic stack answer to a sorting parent', () => {
    expect(
      followUpAbandonsParentTopic({
        parentQuestion: SORTING_PARENT,
        candidateAnswer:
          'Stack is for local variables and heap is for objects I think. Stack is faster. That is all I know.',
        followUpQuestion: 'What is the difference between stack memory and heap memory?',
      }),
    ).toBe(true)
  })

  it('rejects GraphQL follow-up after an off-topic REST/GraphQL answer to a sorting parent', () => {
    expect(
      followUpAbandonsParentTopic({
        parentQuestion: SORTING_PARENT,
        candidateAnswer: GRAPHQL_ANSWER,
        followUpQuestion:
          'What trade-off would you consider before choosing GraphQL over REST in a production application?',
      }),
    ).toBe(true)
  })

  it('rejects anaphoric GraphQL N+1 follow-up after an off-topic GraphQL answer to a stack/heap parent', () => {
    expect(
      followUpAbandonsParentTopic({
        parentQuestion:
          'What is the difference between stack memory and heap memory? Give an example of when each is used and what happens when either is exhausted.',
        candidateAnswer:
          'REST vs GraphQL: REST maps resources to URLs; GraphQL lets the client ask for a graph. Trade-off: GraphQL shifts cost to the server (N+1, authz per field) while REST is simpler to cache at the CDN.',
        followUpQuestion:
          'Can you explain the N+1 problem associated with GraphQL in more detail?',
      }),
    ).toBe(true)
  })

  it('allows a sorting-related follow-up even when the answer was off-topic', () => {
    expect(
      followUpAbandonsParentTopic({
        parentQuestion: SORTING_PARENT,
        candidateAnswer: GRAPHQL_ANSWER,
        followUpQuestion:
          'Why might one O(n log n) sorting algorithm still be faster than another in practice?',
      }),
    ).toBe(false)
  })

  it('rejects GraphQL follow-up after an off-topic answer to a stack/heap parent', () => {
    expect(
      followUpAbandonsParentTopic({
        parentQuestion:
          'What is the difference between stack memory and heap memory? Give an example of when each is used and what happens when either is exhausted.',
        candidateAnswer: GRAPHQL_ANSWER,
        followUpQuestion:
          'What trade-off would you consider before choosing GraphQL over REST in a production application?',
      }),
    ).toBe(true)
  })

  it('treats hash map in the follow-up as hashmap when the answer used hash map', () => {
    expect(
      followUpAbandonsParentTopic({
        parentQuestion:
          'What is the difference between stack memory and heap memory? Give an example of when each is used and what happens when either is exhausted.',
        candidateAnswer:
          'The problem was slow list lookups on large inputs. I used a hash map so average lookup is O(1). I also put Redis in front. Ultimately p99 latency dropped and the endpoint stayed stable.',
        followUpQuestion:
          'Can you describe the time and space complexity differences between using a hash map versus a list for lookups in this context?',
      }),
    ).toBe(true)
  })

  it('treats hash map in the answer as hashmap in the follow-up', () => {
    expect(
      followUpAbandonsParentTopic({
        parentQuestion:
          'What trade-off would you consider before choosing GraphQL over REST in a production application?',
        candidateAnswer: 'I used a hash map. The p99 latency dropped after deploy.',
        followUpQuestion: 'How did you verify the hashmap p99 latency after deploy?',
      }),
    ).toBe(true)
  })

  it('rejects a hashmap/p99 follow-up after a GraphQL parent and hash-map answer', () => {
    expect(
      followUpAbandonsParentTopic({
        parentQuestion:
          'What trade-off would you consider before choosing GraphQL over REST in a production application?',
        candidateAnswer:
          'The problem was slow list lookups on large inputs. I used a hash map so average lookup is O(1). Ultimately p99 latency dropped and the endpoint stayed stable.',
        followUpQuestion:
          'How did you monitor and verify the p99 latency improvements after deploying your hashmap solution?',
      }),
    ).toBe(true)
  })

  it('allows a same-topic GraphQL follow-up when the parent is REST vs GraphQL', () => {
    expect(
      followUpAbandonsParentTopic({
        parentQuestion:
          'When would you choose GraphQL over REST for a production API, and what are the trade-offs?',
        candidateAnswer: GRAPHQL_ANSWER,
        followUpQuestion:
          'What trade-off would you consider before choosing GraphQL over REST in a production application?',
      }),
    ).toBe(false)
  })
})

describe('sameQuestionText', () => {
  it('matches whitespace-normalized follow-up duplicates', () => {
    expect(
      sameQuestionText(
        'What trade-off would you consider before choosing GraphQL over REST in a production application?',
        'What trade-off would you consider before choosing GraphQL over REST in a production application?',
      ),
    ).toBe(true)
  })

  it('does not match a different core question', () => {
    expect(
      sameQuestionText(
        'What trade-off would you consider before choosing GraphQL over REST in a production application?',
        'What is the difference between stack memory and heap memory?',
      ),
    ).toBe(false)
  })
})

describe('scriptMFollowUpIsDuplicateOf', () => {
  const parent =
    'What is the difference between stack memory and heap memory? Give an example of when each is used and what happens when either is exhausted.'

  it('SCRIPT_M: exact parent restatement is a duplicate', () => {
    expect(
      scriptMFollowUpIsDuplicateOf({
        scriptType: 'SCRIPT_M',
        followUpQuestion: parent,
        priorQuestion: parent,
      }),
    ).toBe(true)
  })

  it('SCRIPT_M: whitespace-normalized parent restatement is a duplicate', () => {
    expect(
      scriptMFollowUpIsDuplicateOf({
        scriptType: 'SCRIPT_M',
        followUpQuestion: `  ${parent}  `,
        priorQuestion: parent,
      }),
    ).toBe(true)
  })

  it('SCRIPT_M: deeper same-topic probe is not a duplicate', () => {
    expect(
      scriptMFollowUpIsDuplicateOf({
        scriptType: 'SCRIPT_M',
        followUpQuestion:
          'What happens when the stack overflows, and how is that different from heap exhaustion?',
        priorQuestion: parent,
      }),
    ).toBe(false)
  })

  it('SCRIPT_M: parent speech with a leading bridge still matches the display question', () => {
    const parent =
      'What trade-off would you consider before choosing GraphQL over REST in a production application?'
    expect(
      scriptMFollowUpIsDuplicateOf({
        scriptType: 'SCRIPT_M',
        followUpQuestion: parent,
        priorQuestion: `Good technical reasoning. One more on that. ${parent}`,
      }),
    ).toBe(true)
    expect(
      questionsAreEquivalent(
        parent,
        `Good technical reasoning. One more on that. ${parent}`,
      ),
    ).toBe(true)
  })

  it('SCRIPT_H / SCRIPT_T: same text is not treated as this SCRIPT_M duplicate', () => {
    expect(
      scriptMFollowUpIsDuplicateOf({
        scriptType: 'SCRIPT_H',
        followUpQuestion: parent,
        priorQuestion: parent,
      }),
    ).toBe(false)
    expect(
      scriptMFollowUpIsDuplicateOf({
        scriptType: 'SCRIPT_T',
        followUpQuestion: parent,
        priorQuestion: parent,
      }),
    ).toBe(false)
  })
})

describe('followUpConflictsWithParentType', () => {
  it('rejects behavioral-looking follow-up on a technical parent', () => {
    expect(
      followUpConflictsWithParentType({
        parentQuestionType: 'technical',
        modelQuestionType: 'technical',
        followUpQuestion: 'Was this entirely your decision?',
      }),
    ).toBe(true)
  })

  it('rejects declared behavioral type on a technical parent', () => {
    expect(
      followUpConflictsWithParentType({
        parentQuestionType: 'technical',
        modelQuestionType: 'behavioral',
        followUpQuestion: 'What happens when stack memory is exhausted?',
      }),
    ).toBe(true)
  })

  it('rejects technical-looking follow-up on a behavioral parent', () => {
    expect(
      followUpConflictsWithParentType({
        parentQuestionType: 'behavioral',
        modelQuestionType: 'behavioral',
        followUpQuestion: 'What is the time complexity of that approach?',
      }),
    ).toBe(true)
  })

  it('allows a technical follow-up on a technical parent', () => {
    expect(
      followUpConflictsWithParentType({
        parentQuestionType: 'technical',
        modelQuestionType: 'technical',
        followUpQuestion:
          'What happens when stack memory is exhausted, and how does that differ from running out of heap memory?',
      }),
    ).toBe(false)
  })

  it('allows a behavioral follow-up on a behavioral parent', () => {
    expect(
      followUpConflictsWithParentType({
        parentQuestionType: 'behavioral',
        modelQuestionType: 'behavioral',
        followUpQuestion: 'What did you personally do in that disagreement, not the team?',
      }),
    ).toBe(false)
  })
})

describe('isAnaphoricFollowUpProbe', () => {
  it('matches high-confidence anaphoric FU wording', () => {
    expect(isAnaphoricFollowUpProbe('Can you elaborate on your answer with more detail?')).toBe(
      true,
    )
    expect(isAnaphoricFollowUpProbe('Walk me through that.')).toBe(true)
    expect(isAnaphoricFollowUpProbe('You mentioned latency — tell me more about that.')).toBe(
      true,
    )
  })

  it('does not match a planned core that only shares the parent topic', () => {
    expect(
      isAnaphoricFollowUpProbe('How would you optimize React rendering performance?'),
    ).toBe(false)
  })
})

describe('speechContainsQuestionMark', () => {
  it('detects a hidden question in ack speech', () => {
    expect(speechContainsQuestionMark('Good approach. How did you communicate that?')).toBe(
      true,
    )
    expect(speechContainsQuestionMark('Thanks. Let’s keep going.')).toBe(false)
  })
})
