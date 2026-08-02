import { authStorage } from "./authStorage";

const KEY = "polli:pay-complete";

export type PayCompletePayload = {
  id: string;
  name?: string;
  note?: string;
  anon?: boolean;
  keepsake?: boolean;
  polliId?: string;
};

async function readRaw(): Promise<string | null> {
  return await Promise.resolve(authStorage.getItem(KEY));
}

export async function savePayComplete(payload: PayCompletePayload): Promise<void> {
  await Promise.resolve(authStorage.setItem(KEY, JSON.stringify(payload)));
}

export async function readPayComplete(): Promise<PayCompletePayload | null> {
  try {
    const raw = await readRaw();
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PayCompletePayload;
    if (!parsed || typeof parsed !== "object") return null;
    return {
      id: String(parsed.id ?? "").trim(),
      name: parsed.name ? String(parsed.name).trim() : undefined,
      note: parsed.note ? String(parsed.note) : undefined,
      anon: Boolean(parsed.anon),
      keepsake: Boolean(parsed.keepsake),
      polliId: parsed.polliId ? String(parsed.polliId) : undefined,
    };
  } catch {
    return null;
  }
}

export async function clearPayComplete(): Promise<void> {
  await Promise.resolve(authStorage.removeItem(KEY));
}
