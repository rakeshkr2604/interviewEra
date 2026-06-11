'use client';

import dynamic from 'next/dynamic';

export const DsaPrepTimelineChart = dynamic(
  () => import('./DsaPrepTimelineChart').then((mod) => mod.DsaPrepTimelineChart),
  { ssr: false }
);

export const DsaTopicFrequencyChart = dynamic(
  () => import('./DsaTopicFrequencyChart').then((mod) => mod.DsaTopicFrequencyChart),
  { ssr: false }
);

export const SweTopicImportanceChart = dynamic(
  () => import('./SweTopicImportanceChart').then((mod) => mod.SweTopicImportanceChart),
  { ssr: false }
);

export const FrontendTopicImportanceChart = dynamic(
  () => import('./FrontendTopicImportanceChart').then((mod) => mod.FrontendTopicImportanceChart),
  { ssr: false }
);

export const HrAnswerFlowDiagram = dynamic(
  () => import('./HrAnswerFlowDiagram').then((mod) => mod.HrAnswerFlowDiagram),
  { ssr: false }
);

export const HrAnswerQualityRadar = dynamic(
  () => import('./HrAnswerQualityRadar').then((mod) => mod.HrAnswerQualityRadar),
  { ssr: false }
);
