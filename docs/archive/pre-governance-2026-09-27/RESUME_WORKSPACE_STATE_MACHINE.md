# Resume Workspace — Lifecycle State Machine (Phase 0)

Working invariant list for upload → parse → verify → interview snapshot.
Status values live in `resumes.lifecycle_status` (synced with legacy `resumes.status` where noted).

```
UPLOADED → PARSING → PARSE_FAILED | REVIEW_READY → VERIFIED → (PRIMARY)
                                              ↘ snapshot-into-interview
                 ↘ (superseded by newer version)
                                              → DELETED
```

## States

| State | Meaning | Legacy `status` |
|---|---|---|
| `uploaded` | File in storage; raw text extracted; no immutable version yet | `uploading` |
| `parsing` | AI/heuristic parse in flight for `latest_upload_id` | `parsing` |
| `parse_failed` | Latest upload's parse failed (recoverable via re-upload) | `failed` |
| `review_ready` | Immutable version written; awaiting user confirm/corrections | `parsed` |
| `verified` | User accepted (or saved corrections as new version) | `parsed` |
| `deleted` | Soft-deleted (`deleted_at` set); hidden from lists | unchanged row |

`PRIMARY` is not a separate lifecycle value — it is `is_primary = true` on a non-deleted resume (exactly one per user when any exist).

## Transitions

| From → To | Trigger | Reversible? | Idempotent retry | Concurrent work |
|---|---|---|---|---|
| ∅ → `uploaded` | `POST /api/resume/upload` stores file + sets `latest_upload_id` | No (new upload supersedes) | Same file re-POST creates new `upload_id` (wins) | Prior parse for old `upload_id` may still run |
| `uploaded` → `parsing` | Client calls `POST /api/resume/parse` (or auto-retry) | No | Re-entry while already `parsing` for same `upload_id` is allowed; only one write wins | Exactly one parse attempt “owns” write via `upload_id` match |
| `parsing` → `review_ready` | Parse succeeds **and** `upload_id === resumes.latest_upload_id` | No (versions immutable) | Retry after success: no-op if version already exists for that `upload_id` | Stale parse discarded if `upload_id` mismatch |
| `parsing` → `parse_failed` | Parse fails **and** `upload_id` still latest | Yes → re-upload | Retry may re-enter `parsing` for same or new `upload_id` | Stale failure must not overwrite newer success |
| `parse_failed` → `uploaded`/`parsing` | Re-upload (new `upload_id`) | — | New `upload_id` always wins | Old parse result discarded |
| `review_ready` → `verified` | Confirm / save-with-no-edits | Soft (new correction version) | Confirm twice: no-op | None required |
| `review_ready`/`verified` → `review_ready` | User corrections → **new** version N+1; invalidate in-flight parse via new `latest_upload_id` | History kept | Same payload retry: create at most one correction version per request id / content hash (API is create-new) | Parser write for older `upload_id` discarded |
| any active → (new version) | New file upload on same resume | Old versions intact | Latest `upload_id` wins | Stale parse discarded |
| `verified` (+ optional primary) → snapshot | Interview start (`script/start` / v1 `start`) | No | Snapshot unique on `interview_id`; retry returns existing | None |
| any → `deleted` | Soft delete API | No (hard purge out of scope) | Delete twice: 404/ idempotent ok | Blocked if in-progress interview references resume |

## Upload / parse race rules (Decision 4) on this machine

1. **`latest_upload_id` is the sole write generation token** on `resumes`.
2. Parser creates version N only when its `upload_id` equals `latest_upload_id` at commit time; otherwise log `[resume:parse-stale]` and discard.
3. Double-upload: second upload sets a new `latest_upload_id` before parse; first parse is always stale.
4. Edit-during-parse: corrections mint a new `latest_upload_id` (and version N+1 from prior version); parser cannot clobber correction because it targets a different version and fails the upload_id check.
5. User correction **never** mutates an existing `resume_versions` row.

## Interview snapshot rule

- On interview start: freeze full `parsed_data` (+ skills raw/canonical, parser_version, optional jd hash) into `resume_interview_snapshots`.
- Turn / question gen / report personalization for v2.1 read **snapshot only**; if null (legacy interviews), fall back to live resume with log `[resume:snapshot-fallback]`.
- Editing/deleting the live resume after start must not change the snapshot row.
