import globalSetup from '../e2e/global-setup';
import { readFileSync } from 'node:fs';

async function main() {
  await globalSetup({} as never);
  console.log('ready=', readFileSync('e2e/.auth/ready', 'utf8').trim());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
