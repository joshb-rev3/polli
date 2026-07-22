import React, { createContext, useContext, useState } from "react";
import { dollars, giftTotals } from "./fees";
import { TranscriptWord, WordSignature } from "./voice";

export type NoteMode = "type" | "speak";

export interface NominationDraft {
  first: string;
  last: string;
  notify: "email" | "phone" | "both";
  email: string;
  phone: string;
  catId: string;
  /** Public campaign overview — why people should donate. Visible on feed & share page. */
  overview: string;
  /** Private note for the nominee only. */
  note: string;
  noteMode: NoteMode;
  noteAudioUri: string | null;
  noteAudioDurationMs: number | null;
  noteWords: TranscriptWord[];
  noteSignatures: WordSignature[];
  timeline: "7" | "14" | "30";
}

const empty: NominationDraft = {
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
  draft: NominationDraft;
  set: (patch: Partial<NominationDraft>) => void;
  reset: () => void;
}

const NominationContext = createContext<Ctx>({
  draft: empty,
  set: () => {},
  reset: () => {},
});

export function NominationProvider({ children }: { children: React.ReactNode }) {
  const [draft, setDraft] = useState<NominationDraft>(empty);
  return (
    <NominationContext.Provider
      value={{
        draft,
        set: (p) => setDraft((d) => ({ ...d, ...p })),
        reset: () => setDraft(empty),
      }}
    >
      {children}
    </NominationContext.Provider>
  );
}

export function useNomination() {
  return useContext(NominationContext);
}

/** Product dollars before fees: $1 kickoff + optional $1 Speak keepsake. */
export function launchProductDollars(draft: Pick<NominationDraft, "noteMode">) {
  return draft.noteMode === "speak" ? 2 : 1;
}

/** Alias for launchProductDollars (product total before fees). */
export function launchTotalDollars(draft: Pick<NominationDraft, "noteMode">) {
  return launchProductDollars(draft);
}

/** What the nominator is charged, including optional fee cover + keepsake. */
export function launchChargeDollars(
  draft: Pick<NominationDraft, "noteMode">,
  coverFees: boolean,
) {
  return dollars(
    giftTotals(coverFees, { keepsake: draft.noteMode === "speak" }).totalCents,
  );
}
