/**
 * Utility functions for sanitizing international phone numbers and generating WhatsApp direct links.
 * Defaults to South Africa (+27) when local 10-digit formats (e.g. 082...) are provided,
 * while preserving international dial codes (+1, +44, +61, +264, etc.).
 */

export function sanitizePhoneNumber(input: string, defaultCountryCode = '27'): string {
  if (!input) return '';
  const trimmed = input.trim();
  
  // If already starts with '+', keep '+' and strip non-digit characters
  if (trimmed.startsWith('+')) {
    const cleanDigits = trimmed.replace(/[^0-9]/g, '');
    return cleanDigits ? `+${cleanDigits}` : '';
  }

  // Strip all non-digits
  const digitsOnly = trimmed.replace(/[^0-9]/g, '');
  if (!digitsOnly) return '';

  // If starts with '00' (international prefix), replace with '+'
  if (digitsOnly.startsWith('00')) {
    return `+${digitsOnly.slice(2)}`;
  }

  // If starts with leading '0' (standard local format e.g. 082 123 4567, 071 999 8888)
  if (digitsOnly.startsWith('0')) {
    const withoutZero = digitsOnly.replace(/^0+/, '');
    return `+${defaultCountryCode}${withoutZero}`;
  }

  // If it already starts with the country code digits without '+' (e.g. 27821234567)
  if (digitsOnly.startsWith(defaultCountryCode) && digitsOnly.length >= 11) {
    return `+${digitsOnly}`;
  }

  // Otherwise, if 9 digits (common local format without 0), prepend country code
  if (digitsOnly.length === 9) {
    return `+${defaultCountryCode}${digitsOnly}`;
  }

  // Return formatted with '+' if valid length
  return `+${digitsOnly}`;
}

/**
 * Returns digits-only international format strictly required by https://wa.me/{number}
 * e.g. "27821234567" (NO leading 0, NO '+', NO spaces)
 */
export function getWhatsAppCleanNumber(input: string, defaultCountryCode = '27'): string {
  const sanitized = sanitizePhoneNumber(input, defaultCountryCode);
  return sanitized.replace(/[^0-9]/g, '');
}

/**
 * Builds a verified https://wa.me/ URL with optional pre-filled message text.
 */
export function buildWhatsAppLink(input: string, messageText?: string, defaultCountryCode = '27'): string | null {
  const cleanNumber = getWhatsAppCleanNumber(input, defaultCountryCode);
  if (!cleanNumber || cleanNumber.length < 8) return null;

  const baseUrl = `https://wa.me/${cleanNumber}`;
  if (messageText && messageText.trim()) {
    return `${baseUrl}?text=${encodeURIComponent(messageText.trim())}`;
  }
  return baseUrl;
}

/**
 * Validates whether a phone number has sufficient digits for dialing.
 */
export function isValidPhoneNumber(input: string): boolean {
  if (!input) return false;
  const digits = input.replace(/[^0-9]/g, '');
  return digits.length >= 9 && digits.length <= 15;
}
