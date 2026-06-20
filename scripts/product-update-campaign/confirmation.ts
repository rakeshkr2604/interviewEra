import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const SEP = '==================================';

export async function confirmCampaignSend(recipientCount: number): Promise<boolean> {
  console.log(SEP);
  console.log('InterviewEra Product Update Campaign');
  console.log('');
  console.log(`Recipients: ${recipientCount}`);
  console.log('');
  console.log('Resending corrected email to ALL eligible users.');
  console.log('Previous sends are not skipped.');
  console.log('');
  console.log('Continue?');
  console.log('(y/N)');
  console.log(SEP);
  console.log('');

  const rl = readline.createInterface({ input, output });
  try {
    const answer = await rl.question('> ');
    return answer.trim().toLowerCase() === 'y';
  } finally {
    rl.close();
  }
}
