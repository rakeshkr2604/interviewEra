/**
 * Structured latency breakdown for resume parse (grep `[resume-parse-pipeline]`).
 */

export type ResumeParsePipelineTiming = {
  pipelineMs: number;
  qualityMs: number;
  aiMs: number | null;
  jsonRepairMs: number | null;
  sanitizeMs: number | null;
  fallbackMs: number | null;
  inputChars: number;
  rawChars: number;
  stage: string;
  model?: string;
  skippedAi?: boolean;
  promptTokens?: number;
  completionTokens?: number;
};

export function logResumeParsePipelineTiming(t: ResumeParsePipelineTiming): void {
  console.info('[resume-parse-pipeline]', JSON.stringify(t));
}
