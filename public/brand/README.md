# InterviewEra brand assets (served)

Canonical mapping and rules: [`docs/Core/BRAND_ASSETS.md`](../../docs/Core/BRAND_ASSETS.md).

Regenerate from the approved kit:

```bash
npm run prepare:logo-package
```

| Folder | Contents |
|---|---|
| `primary/` | Horizontal / vertical / stacked lockups (unmodified package) |
| `primary/ui/` | Primary lockups with board captions cropped (white plate kept) |
| `icons/` | Board-extract square/circle (unmodified) |
| `icons/ui/` | Clean UI marks (label cropped, white plate → alpha) |
| `social/` | Profile kit |
| `monochrome/` | Mono / wordmark references |
| `favicon-source/` | Unmodified package `03-favicon` archive |

Browser/PWA files are served from `/favicon/` and `/favicon.ico`, not from this tree.
