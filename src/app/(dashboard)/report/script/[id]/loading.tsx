import { ScriptReportGeneratingRefresh } from '@/components/interview/ScriptReportGeneratingRefresh';

/**
 * Shown while the server page blocks on generate-on-view / claim wait.
 * Replaces the parent dashboard's blank spinner with a state-aware waiting UI.
 */
export default function ScriptReportLoading() {
  return <ScriptReportGeneratingRefresh poll={false} withChrome />;
}
