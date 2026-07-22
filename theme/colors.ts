export const colors = {
  /** Warmer paper — less brown, more sunlit */
  cream: "#FFF6E8",
  paper: "#FFFBF5",
  white: "#FFFFFF",
  ink: "#19191B",
  ink2: "#3A3A3E",
  /** Placeholder / hint text — lighter than ink2 so empty fields don't look filled */
  inkMuted: "rgba(25, 25, 27, 0.38)",
  green: "#1B4D3E",
  green2: "#1E4136",
  green3: "#0F3D2F",
  marigold: "#F5B800",
  marigold2: "#FFC933",
  coral: "#F2553D",
  coralSoft: "rgba(242,85,61,0.14)",
  /** Soft pink accent for CTAs / highlights */
  blossom: "#F4A4B8",
  blossomSoft: "rgba(244,164,184,0.18)",
  sage: "#53A268",
  sageSoft: "rgba(83,162,104,0.14)",
  line: "rgba(25,25,27,0.08)",
  line2: "rgba(25,25,27,0.14)",
  creamTranslucent: "rgba(255,251,245,0.12)",
  overlay: "rgba(0,0,0,0.5)",
} as const;

export type ColorToken = keyof typeof colors;
