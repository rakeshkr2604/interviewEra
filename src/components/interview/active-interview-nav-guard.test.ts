import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const guardPath = path.join(
  root,
  'src',
  'components',
  'interview',
  'active-interview-nav-guard.tsx',
)
const scriptSession = fs.readFileSync(
  path.join(root, 'src', 'app', '(dashboard)', 'interview', 'script', '[id]', 'page.tsx'),
  'utf8',
)
const sidebar = fs.readFileSync(
  path.join(root, 'src', 'components', 'layout', 'Sidebar.tsx'),
  'utf8',
)
const chrome = fs.readFileSync(
  path.join(root, 'src', 'components', 'layout', 'DashboardChrome.tsx'),
  'utf8',
)
const workspace = fs.readFileSync(
  path.join(root, 'src', 'components', 'layout', 'WorkspaceSwitcher.tsx'),
  'utf8',
)
const exitModal = fs.readFileSync(
  path.join(root, 'src', 'components', 'interview', 'InterviewExitFeedbackModal.tsx'),
  'utf8',
)
const guard = fs.readFileSync(guardPath, 'utf8')

describe('active interview navigation guard contracts', () => {
  it('provider wraps dashboard chrome; session registers and releases the guard', () => {
    expect(chrome).toContain('ActiveInterviewNavGuardProvider')
    expect(scriptSession).toContain('useRegisterActiveInterviewNavGuard')
    expect(scriptSession).toContain('leaveSessionToDashboard')
    expect(scriptSession).toContain('releaseGuard()')
    expect(scriptSession).toContain('isResumableInterviewStatus')
    expect(scriptSession).toContain('InterviewExitFeedbackModal')
    expect(scriptSession).toContain("router.push('/dashboard')")
  })

  it('sidebar, workspace, and streak counter intercept Links while guarding (no silent abandon)', () => {
    expect(sidebar).toContain('navigationLocked')
    expect(sidebar).toContain('Interview in progress')
    expect(sidebar).toContain('interceptNavigation')
    expect(sidebar).not.toMatch(/\/api\/interview\/.*\/abandon/)
    expect(workspace).toContain('interceptNavigation')
    expect(workspace).toContain('Interview in progress')
    expect(workspace).not.toMatch(/\/api\/interview\/.*\/abandon/)

    const streak = fs.readFileSync(
      path.join(root, 'src', 'components', 'layout', 'StreakCounter.tsx'),
      'utf8',
    )
    expect(streak).toContain("href=\"/profile/badges\"")
    expect(streak).toContain('interceptNavigation')
    expect(streak).toContain('Interview in progress')
    expect(streak).not.toMatch(/\/api\/interview\/.*\/abandon/)
  })

  it('blocked navigation UX does not emit lifecycle milestones', () => {
    expect(guard).toContain('Interview in progress')
    expect(guard).toContain('Exit interview')
    expect(guard).toContain('Continue interview')
    expect(guard).not.toContain('interview_abandoned')
    expect(guard).not.toContain('interview_completed')
    expect(guard).not.toMatch(/\/api\/interview\/.*\/abandon/)
    expect(guard).not.toContain('exit-feedback')
  })

  it('beforeunload/popstate are prompt/re-push only (no abandon)', () => {
    expect(guard).toContain('beforeunload')
    expect(guard).toContain('popstate')
    expect(guard).toContain('ieActiveInterviewGuard')
    // Session page must not own unload abandon.
    expect(scriptSession).not.toContain('beforeunload')
    expect(scriptSession).not.toContain('visibilitychange')
  })

  it('explicit Exit still uses exit-feedback modal abandon path', () => {
    expect(exitModal).toContain(`/api/interview/\${interviewId}/abandon`)
    expect(exitModal).toContain('/api/interview/exit-feedback')
    expect(exitModal).toMatch(/marked as\s+abandoned/)
    expect(scriptSession).toContain('onLeave={leaveSessionToDashboard}')
  })

  it('guard is inactive after UI completion (enabled tied to uiPhase)', () => {
    expect(scriptSession).toContain("uiPhase !== 'completed'")
    expect(scriptSession).toContain('guardEnabled')
  })
})
