import { describe, expect, it } from 'vitest';
import {
  buildQgAnswerUserMessage,
  buildQgSetUserMessage,
  isAgenticAiTopic,
} from './prompts';

describe('agentic-AI topic detection', () => {
  it.each([
    'Agentic AI / AI Engineer',
    'LLM Engineering',
    'Production RAG',
    'Multi-agent orchestration',
    'AI engineering systems',
  ])('recognizes %s', (topic) => {
    expect(isAgenticAiTopic(topic)).toBe(true);
  });

  it('does not mark unrelated topics', () => {
    expect(isAgenticAiTopic('System Design')).toBe(false);
    expect(isAgenticAiTopic('SQL Joins')).toBe(false);
  });
});

describe('agentic-AI prompt routing', () => {
  it('adds the deterministic focus marker to set generation', () => {
    const message = buildQgSetUserMessage({
      mode: 'topic',
      role: '',
      level: '3+ years',
      domain: 'general',
      topic: 'Agentic AI / AI Engineer',
    });
    expect(message).toContain('target_topic: Agentic AI / AI Engineer');
    expect(message).toContain('topic_focus: agentic_ai_llm_engineering');
  });

  it('adds the same focus marker to answer coaching', () => {
    const message = buildQgAnswerUserMessage({
      question: 'How would you prevent infinite loops in a ReAct agent?',
      category: 'technical',
      level: '3+ years',
      topic: 'Agentic AI / AI Engineer',
    });
    expect(message).toContain('target_topic: Agentic AI / AI Engineer');
    expect(message).toContain('topic_focus: agentic_ai_llm_engineering');
  });

  it('does not add the focus marker for an unrelated topic', () => {
    const message = buildQgSetUserMessage({
      mode: 'topic',
      role: '',
      level: 'fresher',
      domain: 'general',
      topic: 'React Hooks',
    });
    expect(message).not.toContain('topic_focus:');
  });
});
