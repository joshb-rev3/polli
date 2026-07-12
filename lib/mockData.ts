import { TranscriptWord, WordSignature } from "./voice";

export interface Category {
  id: string;
  emoji: string;
  title: string;
  sub: string;
}

export interface FeedItem {
  id: string;
  name: string;
  role: string;
  cat: Category;
  nominator: string;
  nominatorAv: string;
  story: string;
  storyAudioUri?: string;
  storyAudioDurationMs?: number;
  storyWords?: TranscriptWord[];
  storySignatures?: WordSignature[];
  photo: string[]; // gradient stops
  raised: number;
  backers: number;
  daysLeft: number;
  live: boolean;
}

export interface Note {
  from: string;
  av: string;
  text: string;
  when: string;
  anon?: boolean;
}

export const CATEGORIES: Category[] = [
  { id: "just-because", emoji: "🌼", title: "Just Because", sub: "A little cheer" },
  { id: "birthday", emoji: "🎂", title: "Birthday", sub: "Another trip around" },
  { id: "hard-time", emoji: "🤍", title: "Hard Time", sub: "A lift when needed" },
  { id: "teacher", emoji: "🍎", title: "Amazing Teacher", sub: "An A+ in everything" },
  { id: "nurse", emoji: "🩺", title: "Healthcare Hero", sub: "Quiet, steady care" },
  { id: "new-parent", emoji: "🍼", title: "New Parent", sub: "Small hands, long days" },
  { id: "thanks", emoji: "✨", title: "Thank You", sub: "You saw me" },
  { id: "community", emoji: "🌿", title: "Community", sub: "The glue of a block" },
];

export const TIMELINES = [
  { id: "7", label: "1 week", hint: "Most popular" },
  { id: "14", label: "2 weeks" },
  { id: "30", label: "1 month" },
] as const;

export const INSPO = [
  "You make everything feel a little easier — thank you.",
  "Just a small note to say you're appreciated!",
  "I'm grateful for you, and I hope this makes you smile!",
  "Caught you being awesome. Here's a tiny high-five.",
  "One dollar, a big thanks, and a whole lot of meant-it.",
];

export const FEED: FeedItem[] = [
  {
    id: "n1",
    name: "Ms. Eileen Ortega",
    role: "Amazing Teacher",
    cat: CATEGORIES[3],
    nominator: "Miranda Bauer",
    nominatorAv: "M",
    story:
      "Ms. Ortega stayed after school three times this week to help my 3rd grader work through his reading. She asked nothing for herself — just packed an extra lunch and handed over a stack of library books. She is an A+ in everything.",
    photo: ["#c98b5e", "#6b3920"],
    raised: 47,
    backers: 47,
    daysLeft: 3,
    live: true,
  },
  {
    id: "n2",
    name: "Marcus Reyes",
    role: "Night-shift Nurse",
    cat: CATEGORIES[4],
    nominator: "Dana S.",
    nominatorAv: "D",
    story:
      "Marcus worked a 14-hour shift and still drove my mom home when her ride fell through. He's the quietest kind of hero and he deserves a lunch that isn't a vending machine granola bar.",
    photo: ["#6b93a8", "#263a4a"],
    raised: 82,
    backers: 82,
    daysLeft: 5,
    live: true,
  },
  {
    id: "n3",
    name: "Priya Mehta",
    role: "First-Time Mom",
    cat: CATEGORIES[5],
    nominator: "Aunt Judy",
    nominatorAv: "J",
    story:
      "Baby Kiran arrived two weeks early and Priya is running on vibes and oat milk. Her mom group is spreading the word so she can pick up dinner without math. Just because.",
    photo: ["#e7c8a0", "#a77f4f"],
    raised: 23,
    backers: 23,
    daysLeft: 6,
    live: true,
  },
  {
    id: "n4",
    name: "Coach Bo Williams",
    role: "Just Because",
    cat: CATEGORIES[0],
    nominator: "The 2018 Team",
    nominatorAv: "B",
    story:
      "Coach Bo never missed a Saturday. Not one. Twenty-two of us got together to say thank you — and to buy him the pair of running shoes he absolutely will not buy himself.",
    photo: ["#83a268", "#1b4d3e"],
    raised: 134,
    backers: 134,
    daysLeft: 2,
    live: true,
  },
];

export const ME = {
  name: "You",
  handle: "@you",
  given: 7,
  received: 0,
  nominated: 2,
  eligible: true,
};

export const MY_GIVES = [
  { id: "g1", name: "Ms. Eileen Ortega", when: "today", amount: 1.5, cat: CATEGORIES[3] },
  { id: "g2", name: "Priya Mehta", when: "2 days ago", amount: 1.0, cat: CATEGORIES[5] },
  { id: "g3", name: "Marcus Reyes", when: "last week", amount: 1.5, cat: CATEGORIES[4] },
  { id: "g4", name: "Coach Bo Williams", when: "2 weeks ago", amount: 1.0, cat: CATEGORIES[0] },
];

export const MY_NOMINATIONS = [
  {
    id: "m1",
    name: "Uncle Dev",
    role: "Hard Time",
    raised: 28,
    goal: 50,
    backers: 28,
    daysLeft: 4,
    cat: CATEGORIES[2],
  },
  {
    id: "m2",
    name: "Ms. Hana Lee",
    role: "Amazing Teacher",
    raised: 104,
    goal: 100,
    backers: 104,
    daysLeft: 0,
    cat: CATEGORIES[3],
    complete: true,
  },
];

export const NOTES: Record<string, Note[]> = {
  n1: [
    { from: "Dana", av: "D", text: "You were my favorite teacher in 4th grade, still think about your classroom 🌼", when: "2h" },
    { from: "anonymous bee", av: "🐝", text: "Thank you for seeing my kid when I couldn't.", when: "5h", anon: true },
    { from: "Paul K.", av: "P", text: "A+ in everything indeed. Pass it along!", when: "1d" },
    { from: "Ricky", av: "R", text: "One petal, with love.", when: "1d" },
    { from: "Leah", av: "L", text: "You make the world sweeter", when: "2d" },
  ],
  n2: [
    { from: "Maya", av: "M", text: "Nurses are angels and you are THE angel.", when: "3h" },
    { from: "anonymous bee", av: "🐝", text: "Buy yourself a real lunch please 🥪", when: "6h", anon: true },
    { from: "Jordan", av: "J", text: "Proud to pile on for you, Marcus.", when: "1d" },
  ],
  n3: [
    { from: "Aunt Judy", av: "J", text: "Sleep when he sleeps. We got dinner. 🤍", when: "4h" },
    { from: "Kira", av: "K", text: "Sending oat milk vibes", when: "1d" },
  ],
  n4: [
    { from: "Terrell", av: "T", text: "2018 team forever. Thanks Coach.", when: "1h" },
    { from: "anonymous bee", av: "🐝", text: "You changed my life. Quietly. Thank you.", when: "3h", anon: true },
    { from: "Mom of #7", av: "M", text: "Every Saturday for FOUR years. A hero.", when: "5h" },
    { from: "Devon", av: "D", text: "Pass it along — we got you, coach", when: "1d" },
    { from: "Sara", av: "S", text: "A+ dad, A+ coach.", when: "2d" },
    { from: "anonymous bee", av: "🐝", text: "The tiniest, loudest thank-you.", when: "2d", anon: true },
  ],
};

export const QUICK_NOTES = [
  "You make the world sweeter 🌼",
  "Proud to pile on for you",
  "Pass it along — we got you",
  "This is the tiniest, loudest thank-you",
  "One petal, with love",
];
