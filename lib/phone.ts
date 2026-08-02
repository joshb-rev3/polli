/** Digits only (US numbers capped at 10). */
export function phoneDigits(value: string) {
  return value.replace(/\D/g, "").slice(0, 10);
}

/** Format as 555-123-4567 while typing — dashes are inserted automatically. */
export function formatPhoneInput(value: string) {
  const digits = phoneDigits(value);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}
