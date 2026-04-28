import React, { createContext, useContext, useState } from "react";

export type Tone = "warm" | "playful" | "formal";

interface ToneCopy {
  cta_nominate: string;
  cta_give: string;
  headline_splash: string[];
  feed_empty: string;
  give_title: string;
  give_sub: string;
  launch_title: string;
  launch_sub: string;
  story_prompt: (name: string) => string;
}

export const TONES: Record<Tone, ToneCopy> = {
  warm: {
    cta_nominate: "Make someone's day",
    cta_give: "Give $1",
    headline_splash: ["One dollar.", "Endless good.", "Just because."],
    feed_empty: "the garden is quiet for now",
    give_title: "Who deserves a little kindness today?",
    give_sub: "Let's set up their polli. Takes about 60 seconds.",
    launch_title: "is in bloom.",
    launch_sub: "You gave the first dollar. Share the link so others can pile on.",
    story_prompt: (n) => `Write a few words to make ${n || "them"} smile…`,
  },
  playful: {
    cta_nominate: "Spread the good stuff →",
    cta_give: "Toss in $1",
    headline_splash: ["A buck.", "A big feeling.", "For no reason at all."],
    feed_empty: "that's all the good vibes, folks",
    give_title: "Who's about to get a very nice surprise?",
    give_sub: "We'll set up their polli in like a minute flat.",
    launch_title: "is LIVE, baby!",
    launch_sub: "You kicked it off. Now go share it everywhere.",
    story_prompt: (n) => `Spill the good stuff — what makes ${n || "them"} amazing?`,
  },
  formal: {
    cta_nominate: "Begin a nomination",
    cta_give: "Donate $1",
    headline_splash: ["One dollar.", "Meaningful impact.", "A simple gesture."],
    feed_empty: "End of current nominations",
    give_title: "Please identify the recipient of your nomination.",
    give_sub: "This will take approximately one minute to complete.",
    launch_title: "nomination is active.",
    launch_sub:
      "Your initial $1 donation has been recorded. Please share the link to increase contributions.",
    story_prompt: (n) => `Briefly describe why ${n || "they"} deserve this nomination.`,
  },
};

interface ToneContextValue {
  tone: Tone;
  setTone: (t: Tone) => void;
  copy: ToneCopy;
}

const ToneContext = createContext<ToneContextValue>({
  tone: "warm",
  setTone: () => {},
  copy: TONES.warm,
});

export function ToneProvider({ children }: { children: React.ReactNode }) {
  const [tone, setTone] = useState<Tone>("warm");
  return (
    <ToneContext.Provider value={{ tone, setTone, copy: TONES[tone] }}>
      {children}
    </ToneContext.Provider>
  );
}

export function useTone() {
  return useContext(ToneContext);
}
