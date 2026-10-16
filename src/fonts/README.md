# Self-hosted UI fonts

Latin `woff2` subsets for `next/font/local` in `src/app/layout.tsx`.

**Why local:** Vercel preview builds intermittently fail in `next/font/google` (`Cannot read properties of null (reading '1')`) when the Google Fonts CSS fetch/parse returns an unexpected response. Local files remove that build-time network dependency.

**License:** SIL Open Font License 1.1 via Google Fonts (Bricolage Grotesque, DM Sans, JetBrains Mono, Instrument Serif).

**Refresh:** Re-download latin subsets from Google Fonts CSS (`User-Agent: Chrome`) and replace the `latin*.woff2` files when updating weights or families.
