const ORIGIN = 'https://app.invalid';

/**
 * Only allow in-app redirect targets (prevents open redirects via ?next=).
 * Browsers read "\" as "/" and silently drop tabs and newlines, so values like
 * "/\evil.com" or "/\t/evil.com" would become protocol-relative links to
 * another site even though they start with a single slash.
 */
export const safeNext = (value, fallback = '/dashboard') => {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return fallback;
  if (/[\\\u0000-\u001f\u007f]/.test(value)) return fallback;
  try {
    return new URL(value, ORIGIN).origin === ORIGIN ? value : fallback;
  } catch {
    return fallback;
  }
};
