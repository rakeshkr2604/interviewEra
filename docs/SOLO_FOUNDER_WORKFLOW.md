# Solo Founder Workflow — AI-Assisted Engineering at InterviewEra

**Status: DESIGN.** Phases 6+7 of the [Engineering Platform](ENGINEERING_PLATFORM.md): how one engineer plus multiple AI tools ship a production SaaS without regressions.

---

## 1. The operating model

You are not one engineer. You are an engineering *manager* with a staff of AI tools (Claude Code, Cursor, VS Code assistants, multiple models) that are fast, tireless, occasionally confidently wrong, and share no memory with each other. The platform's job is to give that staff a single contract, a single verification machine, and zero unsupervised access to the money.

**The contract is CLAUDE.md.** It already functions this way (invariants, High Risk table, working rules, verification requirements) and it is tool-agnostic prose — Cursor rules and any other tool's context should *point at it*, never fork it. One source; forks drift (the repo's own archived `docs/archive/SKILL_*.md` files are the cautionary tale — they describe a stack that doesn't exist).

## 2. Tool roles

| Tool | Role | Boundaries |
|---|---|---|
| Claude Code | Primary implementer + reviewer. Uses `.claude/commands/` (6 exist: `/review`, `/bug`, `/security`, `/seo`, `/release`, `/architecture`) and repo skills | Full workflow, but same High-Risk rules as any tool |
| Cursor / VS Code AI | Inline completion, small edits, exploration | Must inherit CLAUDE.md via their config pointing to it (**current Cursor config: Unknown — not verified from repository** — no `.cursorrules`/`.cursor/` found; create one line: "Read CLAUDE.md first") |
| Multiple models | Second opinions on High-Risk diffs (cheap adversarial review); never parallel implementers on the same files | Divergent edits from two tools on one subsystem = merge chaos; one writer at a time |

## 3. The AI development loop (per change)

1. **Frame** — you write the task with the *why*; name the subsystem. If it touches a High Risk System (CLAUDE.md table), say so explicitly — this triggers the docs-first rule.
2. **AI reads before writing** — the relevant `docs/*.md` (mechanized by CLAUDE.md working rule #1; the reading is the regression-prevention).
3. **AI implements on a branch** — never on main. Branch = the blast-radius container for AI output.
4. **AI self-verifies** — lint/typecheck/tests locally + domain check (razorpay suite, `verify:pdf`, voice units). CLAUDE.md rule #7 ("never claim verification that wasn't run") is the honesty clause; treat any AI "should work" as untested.
5. **AI reviews AI** — run `/review` (and `/security` on auth/payment/API-surface diffs) on the diff before you look. A different model than the implementer is measurably useful here — different blind spots. This is where most AI-generated regressions die: the reviewer model has no authorship bias.
6. **Human reads the diff** — you, always, every line of: payments, auth, migrations, middleware, SEO metadata, credit logic. For low-risk diffs (copy, styling, tests) you may skim — the gates catch what you miss.
7. **PR → CI → merge** — machine gates (QUALITY_GATES.md) run regardless of who/what wrote the code. This is the core anti-regression property: **AI output goes through a pipeline that doesn't know it's AI output.**
8. **Post-merge** — production smoke watches; risky changes soaked on a preview first (middleware, voice, anything CLAUDE.md marks High Risk).

## 4. Where AI must never have autonomy (hard lines)

These require an explicit human "go" per action, regardless of tool or confidence:

- **Anything in the payment path** — `src/lib/razorpay/**`, `src/app/api/payments/**`, credit RPCs, pricing. (Real prior incident; CLAUDE.md invariants #1/#2.)
- **Database migrations** — writing one is fine; *applying* one to production never. Also: any statement touching `users` privileged columns, `guard_users_privileged_update`, RLS policies, grants (invariants #2/#3/#10).
- **`middleware.ts`, `vercel.json`, `next.config.ts`** — the redirect/CSP/SEO trinity (invariants #6/#7/#8).
- **Deleting anything it didn't create this session** — files, tables, docs, env vars. (The 8-deleted-docs incident is exactly this failure class — TECH_DEBT C1/C2.)
- **`git push` to main, tag creation, Vercel/Supabase dashboard changes, spending money** (new SaaS, paid tiers, tokens).
- **Editing CLAUDE.md invariants** — AI may propose, human commits.

## 5. What is always automated (never ask a human)

Lint/format, typecheck, unit+e2e on push, PDF fixtures, secret scan, dependency PRs (Dependabot — human merges, machine opens), weekly repo-health scans, nightly voice script + prod probes, changelog generation, post-deploy smoke. If a machine can decide it deterministically, a human never should.

## 6. What stays manual forever (and is encoded as ritual, not left to memory)

Mobile voice smoke (real device) · payment dual-order trace · both-auth-flag verification (until the CI matrix exists) · merge button on every PR · release tagging · rollback decisions · Dependabot merges · anything ambiguous the gates flag as warning. These live in PR templates and the release checklist so forgetting is structurally hard.

## 7. Preventing AI-generated regressions — the five mechanisms, ranked

1. **Gates that don't care about authorship** (QUALITY_GATES #1–10): strict tsc + the test suites catch the majority class of AI errors (plausible-but-wrong types, broken imports, changed contracts).
2. **Docs-first context** (CLAUDE.md rule #1 + per-subsystem docs/): most AI regressions in this repo's history are *context* failures — the tool didn't know the invariant existed. The invariant docs are the vaccine; keeping them true is why docs drift is a Critical debt class.
3. **Cross-model review** (`/review`, `/security` commands): authorship-blind adversarial pass.
4. **Branch + preview isolation**: AI output never touches production without surviving CI and (for risky paths) a deployed preview.
5. **The honesty clause**: "Never claim verification that wasn't actually run" (CLAUDE.md #7) — enforced by you treating unverified AI claims as false by default.

## 8. Weekly rhythm (the whole platform in ~30 min/week of meta-work)

- **Monday**: read the rolling `repo-health` + `nightly-report` issues (deltas only). Merge Dependabot PRs if green.
- **Per change**: the loop in §3 — the platform's cost is seconds per PR, not hours per week.
- **Per release** (when a chunk lands): 15-minute ritual from RELEASE_STRATEGY.md.
- **Per incident**: `docs/RUNBOOK.md` (to be written — backlog item), two rollback paths, one-paragraph postmortem note on the release.
- **Quarterly**: re-read TECH_DEBT.md; promote/demote; delete one warning stream nobody read.

## 9. Failure mode to watch in yourself

The platform fails silently if the founder starts treating it as optional under deadline pressure — pushing to main "just this once," merging red "because it's obviously fine." The design accounts for this the only way possible: the compliant path is engineered to be *faster* than the bypass (AI pre-review catches issues before CI would; path-filtered CI keeps PRs quick; auto-merge-on-green removes waiting). If you find yourself bypassing, the fix is to make the gate faster, not to keep bypassing — edit the platform, don't ignore it.
