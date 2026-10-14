-- Allow the local ChatGPT prompt builder to record anonymized usage
-- counters alongside the other free tools.
--
-- mode stores only the preparation goal
-- (hr | project | technical | comprehensive).
-- No resume text, prompt text, or job description is stored.

ALTER TABLE public.tool_usage_events
  DROP CONSTRAINT IF EXISTS tool_usage_events_tool_check;

ALTER TABLE public.tool_usage_events
  ADD CONSTRAINT tool_usage_events_tool_check
  CHECK (tool IN ('ats', 'question_generator', 'star', 'prompt_builder'));
