-- Add deterministic interviewer selection to interviews
ALTER TABLE interviews
ADD COLUMN IF NOT EXISTS interviewer_id TEXT;

ALTER TABLE interviews
DROP CONSTRAINT IF EXISTS interviews_interviewer_id_check;

ALTER TABLE interviews
ADD CONSTRAINT interviews_interviewer_id_check
CHECK (interviewer_id IS NULL OR interviewer_id IN ('priya', 'arjun'));

UPDATE interviews
SET interviewer_id = COALESCE(interviewer_id, 'priya')
WHERE interviewer_id IS NULL;

ALTER TABLE interviews
ALTER COLUMN interviewer_id SET DEFAULT 'priya',
ALTER COLUMN interviewer_id SET NOT NULL;
