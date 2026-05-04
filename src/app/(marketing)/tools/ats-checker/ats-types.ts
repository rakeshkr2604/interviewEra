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

export type AtsErrorCode =
  | 'PARSER_UNAVAILABLE'
  | 'ENCRYPTED'
  | 'SCANNED_NO_TEXT'
  | 'CORRUPT'
  | 'UNSUPPORTED'
  | 'EMPTY'
  | 'TOO_LARGE'
  | 'NO_FILE'
  | 'AI_ERROR'
  | 'RATE_LIMIT'
  | 'NOT_CONFIGURED'
  | 'TOO_SHORT';

export interface AtsState {
  result?: AtsResult;
  error?: string;
  code?: AtsErrorCode;
}

export const initialState: AtsState = {};
