/** Bump when the structured parse pipeline changes enough to warrant re-parse. */
export const RESUME_PARSER_VERSION = 'parse-v2' as const;

export type ResumeParserVersion = typeof RESUME_PARSER_VERSION;
