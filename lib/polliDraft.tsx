import React, { createContext, useContext, useState } from "react";
import { dollars, giftTotals } from "./fees";
import { TranscriptWord, WordSignature } from "./voice";

export type NoteMode = "type" | "speak";

export interface PolliDraft {
  first: string;
  last: string;
  notify: "email" | "phone" | "both";
  email: string;
  phone: string;
  catId: string;
  /** Public campaign overview — why people should donate. Visible on feed & share page. */
  overview: string;
  /** Private note for the recipient only. */
  note: string;
  noteMode: NoteMode;
  noteAudioUri: string | null;
  noteAudioDurationMs: number | null;
  noteWords: TranscriptWord[];
  noteSignatures: WordSignature[];
  timeline: "7" | "14" | "30";
}

const empty: PolliDraft = {
  first: "",
  last: "",
  notify: "email",
  email: "",
  phone: "",
  catId: "",
  overview: "",
  note: "",
  noteMode: "type",
  noteAudioUri: null,
  noteAudioDurationMs: null,
  noteWords: [],
  noteSignatures: [],
  timeline: "7",
};

interface Ctx {
  draft: PolliDraft;
  set: (patch: Partial<PolliDraft>) => void;
  reset: () => void;
}

const PolliDraftContext = createContext<Ctx>({
  draft: empty,
  set: () => {},
  reset: () => {},
});

export function PolliDraftProvider({ children }: { children: React.ReactNode }) {
  const [draft, setDraft] = useState<PolliDraft>(empty);
  return (
    <PolliDraftContext.Provider
      value={{
        draft,
        set: (p) => setDraft((d) => ({ ...d, ...p })),
        reset: () => setDraft(empty),
      }}
    >
      {children}
    </PolliDraftContext.Provider>
  );
}

export function usePolliDraft() {
  return useContext(PolliDraftContext);
}

/** True when the draft includes a paid voice keepsake (+$1). */
export function hasVoiceKeepsake(
  draft: Pick<PolliDraft, "noteMode" | "noteAudioUri">,
) {
  return draft.noteMode === "speak" && Boolean(draft.noteAudioUri);
}

/** Product dollars before fees: $1 kickoff + optional $1 Speak keepsake. */
export function launchProductDollars(
  draft: Pick<PolliDraft, "noteMode" | "noteAudioUri">,
) {
  return hasVoiceKeepsake(draft) ? 2 : 1;
}

/** Alias for launchProductDollars (product total before fees). */
export function launchTotalDollars(
  draft: Pick<PolliDraft, "noteMode" | "noteAudioUri">,
) {
  return launchProductDollars(draft);
}

/** What the starter is charged, including fees + optional keepsake. */
export function launchChargeDollars(
  draft: Pick<PolliDraft, "noteMode" | "noteAudioUri">,
) {
  return dollars(giftTotals({ keepsake: hasVoiceKeepsake(draft) }).totalCents);
}
