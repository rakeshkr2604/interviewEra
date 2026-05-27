/**
 * Structured one-line logs for LLM calls — easy to grep in Vercel / Splunk.
 * Never log prompts or PII; operational fields only.
 */

export interface InterviewAiCompletionLog {
  event: 'openrouter_completion';
  operation: string;
  model: string;
  provider: 'openrouter';
  latency_ms: number;
  success: boolean;
  timeout?: boolean;
  http_status?: number;
  prompt_tokens?: number;
  completion_tokens?: number;
  retries?: number;
}

export function logInterviewAiCompletion(fields: InterviewAiCompletionLog): void {
  try {
    console.info('[ai-completion]', JSON.stringify(fields));
  } catch {
    console.info('[ai-completion]', fields);
  }
}
