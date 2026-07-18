/**
 * ATS Checker v2 orchestrator — parseability + extraction + structure + optional JD match.
 */

import { analyzeParseability, type AtsSourceKind } from '@/lib/ats/parseability';
import { inspectPdfLayout } from '@/lib/ats/pdf-layout-inspect';
import {
  extractResumeFields,
  scoreFieldExtraction,
} from '@/lib/ats/field-extraction';
import { analyzeStructureQuality } from '@/lib/ats/structure-quality';
import { buildActionItems } from '@/lib/ats/action-items';
import { buildJdMatchActionItems, computeJdMatch } from '@/lib/ats/jd-match';
import type { AtsResultV2 } from '@/lib/ats/types';

export interface RunAtsAnalysisInput {
  rawText: string;
  /** PDF bytes for layout inspect; omit/null for TXT/DOCX. */
  pdfBytes: Uint8Array | null;
  sourceKind: AtsSourceKind;
  /** Optional job description — enables JD Match dimension. */
  jobDescription?: string;
}

export interface RunAtsAnalysisMeta {
  model: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  jdExtractUsage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  embeddingUsage?: {
    prompt_tokens?: number;
    total_tokens?: number;
    cost?: number;
  };
  embeddingModel?: string;
}

export async function runAtsAnalysis(
  input: RunAtsAnalysisInput,
): Promise<{ result: AtsResultV2; meta: RunAtsAnalysisMeta }> {
  let layout = null;
  if (input.sourceKind === 'pdf' && input.pdfBytes && input.pdfBytes.byteLength > 0) {
    layout = await inspectPdfLayout(input.pdfBytes.slice());
  }

  const parseability = analyzeParseability({
    rawText: input.rawText,
    layout,
    sourceKind: input.sourceKind,
  });

  const llm = await extractResumeFields(input.rawText);
  const fieldScore = scoreFieldExtraction(llm.extracted);
  const structure = analyzeStructureQuality(llm.extracted, input.rawText);

  const missingFields = llm.degraded
    ? [
        ...new Set([
          ...fieldScore.missingFields,
          'name',
          'email',
          'phone',
          'experience',
          'education',
          'skills',
        ]),
      ]
    : fieldScore.missingFields;

  const actionItems = buildActionItems({
    parseabilityFindings: parseability.findings,
    structureFindings: structure.findings,
    missingFields,
    extractionDegraded: llm.degraded,
  });

  const jdText = input.jobDescription?.trim() ?? '';
  let jdMatch = null;
  let jdMeta: RunAtsAnalysisMeta['jdExtractUsage'];
  let embeddingUsage: RunAtsAnalysisMeta['embeddingUsage'];
  let embeddingModel: string | undefined;

  if (jdText.length >= 40) {
    const computed = await computeJdMatch(llm.extracted, jdText);
    jdMatch = computed.jdMatch;
    jdMeta = computed.meta.jdExtractUsage;
    embeddingUsage = computed.meta.embeddingUsage;
    embeddingModel = computed.meta.embeddingModel;
    actionItems.push(...buildJdMatchActionItems(computed.jdMatch));
    const rank = { high: 0, medium: 1, low: 2 } as const;
    actionItems.sort((a, b) => rank[a.priority] - rank[b.priority]);
    actionItems.splice(12);
  }

  const result: AtsResultV2 = {
    parseability: {
      score: parseability.score,
      findings: parseability.findings,
    },
    fieldExtraction: {
      score: llm.degraded ? 0 : fieldScore.score,
      extracted: llm.extracted,
      missingFields,
      extractionDegraded: llm.degraded || undefined,
    },
    structureQuality: {
      score: structure.score,
      findings: structure.findings,
    },
    actionItems,
    jdMatch,
  };

  console.info(
    '[ats-checker] analysis complete',
    JSON.stringify({
      model: llm.model,
      usage: llm.usage ?? null,
      parseability: result.parseability.score,
      fieldExtraction: result.fieldExtraction.score,
      structureQuality: result.structureQuality.score,
      jdMatch: result.jdMatch?.score ?? null,
      embeddingModel: embeddingModel ?? null,
      embeddingUsage: embeddingUsage ?? null,
      jdExtractUsage: jdMeta ?? null,
      degraded: llm.degraded,
      imageHardWarning: parseability.imageBasedHardWarning,
    }),
  );

  return {
    result,
    meta: {
      model: llm.model,
      usage: llm.usage,
      jdExtractUsage: jdMeta,
      embeddingUsage,
      embeddingModel,
    },
  };
}
