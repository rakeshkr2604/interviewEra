/** Initials for avatar fallbacks — shared by navbar, dashboard, settings. */
export function getUserInitials(name: string | null | undefined, email: string): string {
  const trimmed = name?.trim();
  if (trimmed) {
    const parts = trimmed.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0]![0] ?? ''}${parts[parts.length - 1]![0] ?? ''}`.toUpperCase();
    }
    return trimmed.slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

/** OAuth providers (Google) may supply a remote picture URL before a custom upload. */
export function resolveOAuthPictureUrl(metadata: Record<string, unknown> | undefined): string | null {
  if (!metadata) return null;
  const picture = metadata.picture;
  if (typeof picture === 'string' && picture.startsWith('https://')) return picture;
  const avatarUrl = metadata.avatar_url;
  if (typeof avatarUrl === 'string' && avatarUrl.startsWith('https://')) return avatarUrl;
  return null;
}
