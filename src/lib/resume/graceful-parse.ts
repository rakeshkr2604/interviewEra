/**
 * AI parse with heuristic fallback on timeout/error.
 * Uses a single operation deadline (no shorter outer race) so models that
 * finish in ~9s are not discarded while the HTTP call keeps running.
 */

import { parseResume } from '@/lib/openai/parse-resume';
import { sanitizeParsedResume } from '@/lib/utils/sanitize-parsed-resume';
import {
  assessHeuristicQuality,
  buildFallbackParsedResume,
} from '@/lib/resume/fallback-parse';
import { scoreExtractedText } from '@/lib/resume/extraction-quality';
import {
  logResumeParsePipelineTiming,
  type ResumeParsePipelineTiming,
} from '@/lib/resume/parse-pipeline-timing';
import type { ParsedResume } from '@/types/app.types';
import type { ResumeParseQuality } from '@/types/app.types';

export type GracefulParseResult = {
  data: ParsedResume;
  quality: ResumeParseQuality;
  stage: 'ai_full' | 'heuristic_fallback' | 'heuristic_fast_path';
  warning?: string;
  timing: ResumeParsePipelineTiming;
};

function assessAiQuality(data: ParsedResume): ResumeParseQuality {
  const fields =
    (data.skills.length > 0 ? 1 : 0) +
    (data.experience.length > 0 ? 1 : 0) +
    (data.projects.length > 0 ? 1 : 0) +
    (data.education.length > 0 ? 1 : 0) +
    (data.name.trim() ? 1 : 0);
  if (fields >= 4) return 'full';
  if (fields >= 2) return 'degraded';
  return 'minimal';
}

function shouldSkipAiForSpeed(report: ReturnType<typeof scoreExtractedText>): boolean {
  if (process.env.RESUME_PARSE_FORCE_AI === '1') return false;
  return report.band === 'minimal' && report.wordCount < 55;
}

function finishWithHeuristic(
  rawText: string,
  pipelineStart: number,
  qualityMs: number,
  stage: 'heuristic_fallback' | 'heuristic_fast_path',
  opts: { aiMs?: number | null; model?: string; skippedAi?: boolean },
): GracefulParseResult {
  const fbStart = Date.now();
  const fallback = buildFallbackParsedResume(rawText);
  const fallbackMs = Date.now() - fbStart;
  const quality = assessHeuristicQuality(fallback.data);

  const timing: ResumeParsePipelineTiming = {
    pipelineMs: Date.now() - pipelineStart,
    qualityMs,
    aiMs: opts.aiMs ?? null,
    jsonRepairMs: null,
    sanitizeMs: null,
    fallbackMs,
    inputChars: 0,
    rawChars: rawText.length,
    stage,
    model: opts.model,
    skippedAi: opts.skippedAi,
  };
  logResumeParsePipelineTiming(timing);

  return {
    data: sanitizeParsedResume(fallback.data),
    quality,
    stage,
    warning: fallback.data.parse_warning,
    timing,
  };
}

export async function parseResumeGracefully(rawText: string): Promise<GracefulParseResult> {
  const pipelineStart = Date.now();

  const qStart = Date.now();
  const textReport = scoreExtractedText(rawText);
  const qualityMs = Date.now() - qStart;

  if (textReport.band === 'unusable') {
    throw new Error('UNUSABLE_RAW_TEXT');
  }

  if (shouldSkipAiForSpeed(textReport)) {
    return finishWithHeuristic(rawText, pipelineStart, qualityMs, 'heuristic_fast_path', {
      skippedAi: true,
    });
  }

  const aiStart = Date.now();

  try {
    const { data: aiRaw, timing: aiTiming } = await parseResume(rawText);
    const aiMs = Date.now() - aiStart;

    const sanStart = Date.now();
    const ai = sanitizeParsedResume(aiRaw);
    const sanitizeMs = Date.now() - sanStart;

    const quality = assessAiQuality(ai);
    const timing: ResumeParsePipelineTiming = {
      pipelineMs: Date.now() - pipelineStart,
      qualityMs,
      aiMs: aiTiming.aiMs,
      jsonRepairMs: aiTiming.jsonRepairMs,
      sanitizeMs,
      fallbackMs: null,
      inputChars: aiTiming.inputChars,
      rawChars: rawText.length,
      stage: 'ai_full',
      model: aiTiming.model,
      promptTokens: aiTiming.promptTokens,
      completionTokens: aiTiming.completionTokens,
    };
    logResumeParsePipelineTiming(timing);

    return {
      data: {
        ...ai,
        parse_quality: quality,
        ...(quality !== 'full'
          ? {
              parse_warning:
                'We extracted most of your resume, but some sections may be incomplete.',
            }
          : {}),
      },
      quality,
      stage: 'ai_full',
      warning:
        quality !== 'full'
          ? 'We extracted most of your resume, but some sections may be incomplete.'
          : undefined,
      timing,
    };
  } catch (aiErr) {
    const aiMs = Date.now() - aiStart;
    const isTimeout =
      aiErr instanceof Error &&
      (/deadline|timeout|abort/i.test(aiErr.message) || aiErr.name === 'AbortError');
    console.warn(
      '[graceful-parse] AI unavailable, using heuristic parse',
      aiErr instanceof Error ? aiErr.message : aiErr,
      { isTimeout, aiMs },
    );

    return finishWithHeuristic(rawText, pipelineStart, qualityMs, 'heuristic_fallback', {
      aiMs,
    });
  }
}
