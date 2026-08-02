/** Honorifics / role titles that aren't a given name. */
const TITLE =
  /^(ms|mr|mrs|miss|mx|dr|prof|coach|uncle|aunt|rev|sir|madam)\.?$/i;

function tokens(full: string | null | undefined): string[] {
  return (full ?? "").trim().split(/\s+/).filter(Boolean);
}

/**
 * Conversational first name from a full display name.
 * "Ms. Eileen Ortega" → "Ms. Eileen"; "Marcus Reyes" → "Marcus"; "Uncle Dev" → "Uncle Dev".
 */
export function firstName(full: string | null | undefined, fallback = "them"): string {
  const parts = tokens(full);
  if (parts.length === 0) return fallback;
  if (parts.length === 1) return parts[0];
  if (TITLE.test(parts[0])) return `${parts[0]} ${parts[1]}`;
  return parts[0];
}

/** Given + family name for forms/DB (title stripped). "Ms. Eileen Ortega" → Eileen / Ortega. */
export function nameParts(full: string | null | undefined): { first: string; last: string } {
  const parts = tokens(full);
  if (parts.length === 0) return { first: "", last: "" };
  const start = TITLE.test(parts[0]) ? 1 : 0;
  const first = parts[start] || parts[0] || "";
  const last = parts.slice(start + 1).join(" ");
  return { first, last };
}
