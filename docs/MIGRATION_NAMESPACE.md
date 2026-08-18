# Migration namespace

Canonical filenames in `supabase/migrations/` are serial `NNN_name.sql`.
14-digit timestamp names are forbidden. `supabase migration new` creates timestamps
and must not be used; copy the next integer after the highest existing file.

Enforced by `npm run verify:migrations` (`scripts/check-migration-namespace.ts`)
and CI. Do not rewrite existing SQL; add a new serial file instead.

Historical 039–045 are unused. 056–058 are fresh-replay no-ops; their effects
are applied by `089_reconcile_historical_migration_order.sql` after 079.

## Timestamp → serial remap

| Old version | Serial file |
|---|---|
| `20260711000001` | `072_v2_1_script_engine.sql` |
| `20260715200001` | `073_script_turns_submitted_as_corrected.sql` |
| `20260716000001` | `074_answer_evaluations.sql` |
| `20260717000001` | `075_interviews_resume_id_no_cascade.sql` |
| `20260717000002` | `076_script_interview_reports.sql` |
| `20260717000003` | `077_script_interview_reports_harden.sql` |
| `20260717000004` | `078_script_interview_reports_synth_prompt_version.sql` |
| `20260718000001` | `079_resume_versions_and_snapshots.sql` |
| `20260720000001` | `080_tool_usage_events.sql` |
| `20260720000002` | `081_interviews_follow_up_enabled.sql` |
| `20260816000001` | `082_p0_campus_approval_and_authorization.sql` |
| `20260816152656` | `083_campaign_pricing_floors_and_quote_metadata.sql` |
| `20260816155515` | `084_harden_campaign_redemption_ownership.sql` |
| `20260816184057` | `085_phase6a_credit_interview_ownership.sql` |
| `20260816190336` | `086_phase6b_technical_failure_cases.sql` |
| `20260818113309` (prod-only apply_migration alias for 6B) | `086_phase6b_technical_failure_cases.sql` |
| `20260816194343` | `087_phase6c_optional_technical_feedback_rating.sql` |
| `20260817065517` | `088_phase7a_payment_activation_recovery.sql` |
| `20260817162058` | `089_reconcile_historical_migration_order.sql` |
| `20260817165144` | `090_p0_email_data_api_security_remediation.sql` |
| `20260817224413` | `091_domain_pack_rls_security_remediation.sql` |
| (new) | `092_p0_email_service_role_grants_without_default_privileges.sql` |
| (new) | `093_drop_domain_pack_public_read_keep_policies.sql` |
| (new) | `095_pricing_campaigns.sql` |
| `20260818170059` (Staging MCP apply) / `20260818170126` (Production MCP apply) | `095_pricing_campaigns.sql` |
| (new) | `096_stale_active_interview_start.sql` |
| `20260818171838` (Staging MCP apply) / `20260818171756` (Production MCP apply) | `096_stale_active_interview_start.sql` |
| (new) | `097_pricing_campaigns_overlap_and_rls.sql` |
| `20260818170109` (Staging MCP apply) / `20260818170137` (Production MCP apply) | `097_pricing_campaigns_overlap_and_rls.sql` |
| (new) | `098_one_active_interview_unique_index.sql` |
| `20260818171846` (Staging MCP apply) / `20260818171804` (Production MCP apply) | `098_one_active_interview_unique_index.sql` |
| (new) | `099_abandoned_interview_one_resume.sql` |
| `20260818175417` (Staging MCP apply) / `20260818175417` (Production MCP apply) | `099_abandoned_interview_one_resume.sql` |

`20260708161102` (`user_activity_grants`) is the same work as serial `054`.

## 090 vs 092 (email Data API)

`090` and `092` are both recorded as applied on Production and Staging.
The CLI will not treat `090` as pending. Do not un-record it.

| | `090` | `092` |
|---|---|---|
| RLS on the 8 email tables | yes | yes |
| Table GRANTs to `service_role` | exact ops | same exact ops |
| REVOKE ALL FROM | PUBLIC, anon, authenticated, **service_role** (then re-GRANT) | PUBLIC, anon, authenticated only |
| `ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public` | yes (tables, sequences, functions) | **no** |

Production table grants after `092` match Staging after `090`+`092`:
`anon`/`authenticated` have no privileges; `service_role` has only the
intended ops. `092` therefore covers `090`'s **table-level** security.

`090`'s DEFAULT PRIVILEGES are independent and were **not** applied on
Production (`pg_default_acl` for role `postgres` / schema `public` is empty).
Staging did execute them. Do not run `090` on Production: it would change
future postgres-owned object grants, including `service_role`.

History-marking `090` on Production without executing that SQL is required
so `supabase db push` never replays DEFAULT PRIVILEGES. Fresh databases
still run `090` then `092` in file order (Staging-like defaults). Do not
rewrite `090`.

## 094 `interview_turns`

Not equivalent to `072` (`script_turns` + overlapping `interviews` columns).
`094` is the live Production table `interview_turns` plus interviews columns
`current_phase`, `phase_turn_count`, `question_number`, `performance_score`,
`question_pool`. Production already had the schema (80 rows); history was
remapped `20260708174431` → `094` without replay. Staging executed `094`.
