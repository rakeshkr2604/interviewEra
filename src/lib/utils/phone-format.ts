/**
 * Display-only formatting — inserts a space after the +91 country code
 * (e.g. "+919876543210" -> "+91 9876543210") so saved numbers don't render
 * as one unbroken digit string. Never mutates numbers that don't match this
 * exact shape (other country codes, already-spaced input, partial typing)
 * so it's safe to call on every render without fighting the user's input.
 */
export function formatPhoneDisplay(value: string): string {
  const trimmed = value.trim();
  const match = trimmed.match(/^\+91(\d{10})$/);
  return match ? `+91 ${match[1]}` : trimmed;
}
