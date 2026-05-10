/** Parse fetch Response JSON without throwing (HTML/plain 429 bodies break `res.json()`). */
export async function parseResponseJsonSafe<T>(res: Response): Promise<T> {
  try {
    const text = await res.text();
    if (!text.trim()) return {} as T;
    return JSON.parse(text) as T;
  } catch {
    return {} as T;
  }
}
