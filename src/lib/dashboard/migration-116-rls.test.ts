import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const MIGRATION = resolve(
  process.cwd(),
  'supabase/migrations/116_dashboard_perf_indexes_and_rls_initplan.sql',
)

describe('migration 116 RLS init-plan rewrite', () => {
  const sql = readFileSync(MIGRATION, 'utf8')

  it('wraps auth.uid and auth.role in select-initplan form', () => {
    expect(sql).toMatch(/USING \(\(SELECT auth\.uid\(\)\) = user_id\)/)
    expect(sql).toMatch(/WITH CHECK \(\(SELECT auth\.uid\(\)\) = user_id\)/)
    expect(sql).toMatch(/USING \(\(SELECT auth\.role\(\)\) = 'service_role'\)/)
    expect(sql).toMatch(/WITH CHECK \(\(SELECT auth\.role\(\)\) = 'service_role'\)/)
  })

  it('does not weaken policy names or switch to USING \(true\)', () => {
    expect(sql).toMatch(/ALTER POLICY interview_feedbacks_select_own/)
    expect(sql).toMatch(/ALTER POLICY interview_feedbacks_insert_own/)
    expect(sql).toMatch(/ALTER POLICY interview_exit_feedbacks_select_own/)
    expect(sql).toMatch(/ALTER POLICY interview_exit_feedbacks_insert_own/)
    expect(sql).toMatch(/ALTER POLICY interview_diagnostic_events_service_role/)
    expect(sql).not.toMatch(/USING\s*\(\s*true\s*\)/i)
    expect(sql).not.toMatch(/DISABLE ROW LEVEL SECURITY/i)
  })

  it('keeps interview_turns ownership on the user interview set', () => {
    const followOn = readFileSync(
      resolve(process.cwd(), 'supabase/migrations/117_interview_turns_rls_initplan.sql'),
      'utf8',
    )
    expect(followOn).toMatch(/ALTER POLICY "Users can view own interview turns"/)
    expect(followOn).toMatch(/user_id = \(SELECT auth\.uid\(\)\)/)
    expect(followOn).not.toMatch(/USING\s*\(\s*true\s*\)/i)
  })

  it('adds the recovery composite without dropping unused indexes', () => {
    const executable = sql
      .split('\n')
      .filter((line) => !line.trim().startsWith('--'))
      .join('\n')
    expect(executable).toMatch(/idx_interviews_user_engine_status_started/)
    expect(executable).not.toMatch(/DROP INDEX/i)
  })
})
