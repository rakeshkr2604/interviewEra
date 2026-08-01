/**
 * Phase 1 resume storage privacy — signed URL minting from storage_path.
 *
 * Canonical identifier is storage_path (never stored public file_url).
 * Signed URLs are ephemeral and must not be persisted to the database.
 */

export const RESUME_BUCKET = 'resumes';

/** Default signed URL lifetime for authenticated resume downloads. */
export const RESUME_SIGNED_URL_TTL_SECONDS = 120;

export type ResumeStorageSigner = {
  storage: {
    from: (bucket: string) => {
      createSignedUrl: (
        path: string,
        expiresIn: number,
      ) => Promise<{
        data: { signedUrl: string } | null;
        error: { message: string } | null;
      }>;
    };
  };
};

export type MintResumeSignedUrlInput = {
  storagePath: string;
  userId: string;
  resumeId: string;
  /** Override TTL (seconds). Defaults to RESUME_SIGNED_URL_TTL_SECONDS. */
  expiresInSeconds?: number;
};

export type MintResumeSignedUrlResult =
  | {
      ok: true;
      signedUrl: string;
      expiresInSeconds: number;
      expiresAt: string;
      storagePath: string;
    }
  | {
      ok: false;
      reason:
        | 'invalid_path'
        | 'ownership_mismatch'
        | 'sign_failed'
        | 'empty_url';
      message: string;
    };

/**
 * True if path is a resume object owned by userId.
 * Upload keys are `resumes/{userId}/{timestamp}.ext`.
 */
export function isOwnedResumeStoragePath(path: string, userId: string): boolean {
  if (!path || !userId) return false;
  if (path.includes('..') || path.includes('\\')) return false;
  if (path.startsWith('/') || path.includes('//')) return false;
  return path.startsWith(`resumes/${userId}/`) && path.length > `resumes/${userId}/`.length;
}

function logSignedUrlAttempt(fields: {
  userId: string;
  resumeId: string;
  success: boolean;
  reason?: string;
}): void {
  // Never log the signed URL itself.
  console.info(
    '[resume:signed-url]',
    JSON.stringify({
      userId: fields.userId,
      resumeId: fields.resumeId,
      timestamp: new Date().toISOString(),
      success: fields.success,
      ...(fields.reason ? { reason: fields.reason } : {}),
    }),
  );
}

/**
 * Mint a short-lived signed URL for an owned resume storage object.
 * Does not read or write file_url. Callers must not persist the URL.
 */
export async function mintResumeSignedUrl(
  client: ResumeStorageSigner,
  input: MintResumeSignedUrlInput,
): Promise<MintResumeSignedUrlResult> {
  const expiresInSeconds = input.expiresInSeconds ?? RESUME_SIGNED_URL_TTL_SECONDS;
  const storagePath = input.storagePath.trim();

  if (!storagePath) {
    logSignedUrlAttempt({
      userId: input.userId,
      resumeId: input.resumeId,
      success: false,
      reason: 'invalid_path',
    });
    return { ok: false, reason: 'invalid_path', message: 'Missing storage path.' };
  }

  if (!isOwnedResumeStoragePath(storagePath, input.userId)) {
    logSignedUrlAttempt({
      userId: input.userId,
      resumeId: input.resumeId,
      success: false,
      reason: 'ownership_mismatch',
    });
    return {
      ok: false,
      reason: 'ownership_mismatch',
      message: 'Storage path is not owned by the requesting user.',
    };
  }

  const { data, error } = await client.storage
    .from(RESUME_BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds);

  if (error) {
    logSignedUrlAttempt({
      userId: input.userId,
      resumeId: input.resumeId,
      success: false,
      reason: 'sign_failed',
    });
    console.error('[resume:signed-url] createSignedUrl failed:', error.message);
    return { ok: false, reason: 'sign_failed', message: 'Failed to create signed URL.' };
  }

  const signedUrl = data?.signedUrl?.trim() ?? '';
  if (!signedUrl) {
    logSignedUrlAttempt({
      userId: input.userId,
      resumeId: input.resumeId,
      success: false,
      reason: 'empty_url',
    });
    return { ok: false, reason: 'empty_url', message: 'Signed URL was empty.' };
  }

  logSignedUrlAttempt({
    userId: input.userId,
    resumeId: input.resumeId,
    success: true,
  });

  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();
  return {
    ok: true,
    signedUrl,
    expiresInSeconds,
    expiresAt,
    storagePath,
  };
}

/** Response headers that prevent browser/proxy caching of signed download payloads. */
export const RESUME_FILE_NO_STORE_HEADERS = {
  'Cache-Control': 'private, no-store, no-cache, must-revalidate, max-age=0',
  Pragma: 'no-cache',
  Expires: '0',
} as const;
