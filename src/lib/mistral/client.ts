import OpenAI from 'openai';

const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY ?? '';

const mistral = new OpenAI({
  apiKey: MISTRAL_API_KEY,
  baseURL: 'https://api.mistral.ai/v1',
});

export const MISTRAL_MODEL = 'mistral-small-latest';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const MISTRAL_MAX_ATTEMPTS = 4;
const MISTRAL_429_BASE_MS = 2500;

export async function callMistralChat(
  prompt: string,
  temperature = 0.2,
): Promise<string> {
  if (!MISTRAL_API_KEY) {
    throw new Error('[mistral] API key missing — cannot call Mistral');
  }

  let lastError: unknown;
  for (let attempt = 0; attempt < MISTRAL_MAX_ATTEMPTS; attempt++) {
    try {
      const response = await mistral.chat.completions.create({
        model: MISTRAL_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) throw new Error('[mistral] Empty response');
      return content;
    } catch (err) {
      lastError = err;
      const apiErr = err instanceof OpenAI.APIError ? err : null;
      const is429 = apiErr?.status === 429;
      if (is429 && attempt < MISTRAL_MAX_ATTEMPTS - 1) {
        const wait = MISTRAL_429_BASE_MS * Math.pow(2, attempt);
        console.warn(
          `[mistral] 429 rate limit — waiting ${wait}ms before retry ${attempt + 2}/${MISTRAL_MAX_ATTEMPTS}`,
        );
        await sleep(wait);
        continue;
      }
      throw err;
    }
  }

  throw lastError instanceof Error ? lastError : new Error('[mistral] All retries failed');
}

export default mistral;
