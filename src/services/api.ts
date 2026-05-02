// Thin fetch wrapper used by onboarding and interview flows.
// T defaults to ApiResponse which covers all known endpoint shapes.

interface ApiResponse extends Record<string, unknown> {
  resumeText?: string
  skills?: string[]
  projects?: string[]
  role?: string
  experience?: string
  interviewId?: string
  feedback?: string
}

export const api = {
  async get<T = Record<string, unknown>>(url: string): Promise<{ data: T }> {
    const res = await fetch(url, { method: 'GET' })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(text || `Request failed with status ${res.status}`)
    }

    const json: unknown = await res.json()
    return { data: json as T }
  },

  async post<T extends ApiResponse = ApiResponse>(
    url: string,
    data: unknown,
    config?: { headers?: Record<string, string> }
  ): Promise<{ data: T }> {
    const isFormData = data instanceof FormData

    const res = await fetch(url, {
      method: 'POST',
      // For FormData, let the browser set Content-Type + boundary automatically.
      // For JSON, set Content-Type and merge any caller headers.
      headers: isFormData
        ? {}
        : { 'Content-Type': 'application/json', ...(config?.headers ?? {}) },
      body: isFormData ? data : JSON.stringify(data),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(text || `Request failed with status ${res.status}`)
    }

    const json: unknown = await res.json()
    return { data: json as T }
  },
}
