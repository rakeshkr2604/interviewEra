/**
 * Load `.env.staging.local` into process.env, then spawn a command.
 * Next.js will not override already-set keys from `.env.local`.
 *
 *   npx tsx scripts/perf/with-staging-env.ts npm run start
 */
import { spawn } from 'node:child_process'
import { loadSafeStagingEnvironment } from '../../src/lib/env/staging-environment'

loadSafeStagingEnvironment({ type: 'file', path: '.env.staging.local' })

const args = process.argv.slice(2)
if (args.length === 0) {
  process.stderr.write('usage: tsx scripts/perf/with-staging-env.ts <command> [...args]\n')
  process.exit(1)
}

const child = spawn(args[0], args.slice(1), {
  stdio: 'inherit',
  env: process.env,
  shell: true,
})

child.on('exit', (code, signal) => {
  if (signal) {
    process.exit(1)
  }
  process.exit(code ?? 1)
})
