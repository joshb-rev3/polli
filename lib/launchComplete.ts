import { authStorage } from "./authStorage";

const KEY = "polli:launch-complete";

export type LaunchCompletePayload = {
  first: string;
  last: string;
  slug?: string;
  polliId?: string;
  keepsake?: boolean;
  email?: string;
  phone?: string;
  notify?: "email" | "phone" | "both";
};

async function readRaw(): Promise<string | null> {
  return await Promise.resolve(authStorage.getItem(KEY));
}

export async function saveLaunchComplete(payload: LaunchCompletePayload): Promise<void> {
  await Promise.resolve(authStorage.setItem(KEY, JSON.stringify(payload)));
}

export async function readLaunchComplete(): Promise<LaunchCompletePayload | null> {
  try {
    const raw = await readRaw();
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LaunchCompletePayload;
    if (!parsed || typeof parsed !== "object") return null;
    const notify =
      parsed.notify === "email" || parsed.notify === "phone" || parsed.notify === "both"
        ? parsed.notify
        : undefined;
    return {
      first: String(parsed.first ?? "").trim(),
      last: String(parsed.last ?? "").trim(),
      slug: parsed.slug ? String(parsed.slug) : undefined,
      polliId: parsed.polliId ? String(parsed.polliId) : undefined,
      keepsake: Boolean(parsed.keepsake),
      email: parsed.email ? String(parsed.email).trim() : undefined,
      phone: parsed.phone ? String(parsed.phone).trim() : undefined,
      notify,
    };
  } catch {
    return null;
  }
}

export async function clearLaunchComplete(): Promise<void> {
  await Promise.resolve(authStorage.removeItem(KEY));
}

/** Heads-up message so the recipient watches for Polli's claim notice. */
export function recipientTipMessage(firstName: string) {
  const name = firstName.trim() || "friend";
  return (
    `Hey ${name} — I started something special for you on Polli. ` +
    `Keep an eye out for an email or text from Polli so you can claim it. ` +
    `I hope you love it.`
  );
}

export function recipientTipSubject(firstName: string) {
  const name = firstName.trim() || "you";
  return `Something special is coming your way, ${name}`;
}
