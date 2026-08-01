# Archived workflows

Workflows in this directory are **not executed** by GitHub Actions (only
`.github/workflows/*.{yml,yaml}` at the top level are loaded — subdirectories
are ignored).

| File | Why archived |
|---|---|
| `greetings.yml` | Placeholder first-interaction messages; solo repo; burned minutes on every PR via `pull_request_target` |
| `summary.yml` | Optional AI issue summarizer; unused operationally; extra minutes/model calls |

To restore: move a file back to `.github/workflows/` and open a PR.
