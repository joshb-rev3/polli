import React, { createContext, useContext, useState } from "react";
import { TranscriptWord, WordSignature } from "./voice";

export type StoryMode = "type" | "speak";

export interface NominationDraft {
  first: string;
  last: string;
  notify: "email" | "phone" | "both";
  contact: string;
  catId: string;
  story: string;
  storyMode: StoryMode;
  storyAudioUri: string | null;
  storyAudioDurationMs: number | null;
  storyWords: TranscriptWord[];
  storySignatures: WordSignature[];
  timeline: "7" | "14" | "30";
}

const empty: NominationDraft = {
  first: "",
  last: "",
  notify: "email",
  contact: "",
  catId: "",
  story: "",
  storyMode: "type",
  storyAudioUri: null,
  storyAudioDurationMs: null,
  storyWords: [],
  storySignatures: [],
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
