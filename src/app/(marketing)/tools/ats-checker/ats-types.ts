/** Shared ATS checker types + UI state — must NOT live in a `"use server"` file. */

export type AtsIssueType = 'success' | 'warning' | 'error';

export interface AtsIssue {
  type: AtsIssueType;
  text: string;
}

export interface AtsResult {
  score: number;
  issues: AtsIssue[];
}

export interface AtsState {
  result?: AtsResult;
  error?: string;
}

export const initialState: AtsState = {};
