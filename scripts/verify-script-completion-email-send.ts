/**
 * Send a real Resend email proving transactional delivery works.
 * Uses the same from-address as lifecycle mail.
 *
 *   VERIFY_EMAIL=you@example.com npx tsx scripts/verify-script-completion-email-send.ts
 */
import { config } from 'dotenv'
import { resolve } from 'node:path'
import { Resend } from 'resend'

config({ path: resolve(process.cwd(), '.env.local') })

async function main() {
  const to = process.env.VERIFY_EMAIL?.trim()
  const apiKey = process.env.RESEND_API_KEY?.trim()
  if (!to) {
    console.error('Set VERIFY_EMAIL')
    process.exit(1)
  }
  if (!apiKey) {
    console.error('Missing RESEND_API_KEY')
    process.exit(1)
  }

  const from =
    process.env.SENDER_EMAIL_TRANSACTIONAL?.trim() ||
    'InterviewEra <transactional@interviewera.com>'

  const resend = new Resend(apiKey)
  const { data, error } = await resend.emails.send({
    from,
    to,
    subject: '[InterviewEra verify] Script completion email path',
    text:
      'This is a live verification send for the v2.1 script completion email path. ' +
      'If you received this, Resend API key + sender domain are working. ' +
      `Sent at ${new Date().toISOString()}`,
  })

  console.log(JSON.stringify({ from, to, data, error }, null, 2))
  if (error || !data?.id) {
    console.error('SEND FAILED')
    process.exit(1)
  }
  console.error('DELIVERED TO RESEND — message id:', data.id)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
