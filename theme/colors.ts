export const colors = {
  cream: "#F3E9DC",
  paper: "#F8F9F4",
  white: "#FFFFFF",
  ink: "#19191B",
  ink2: "#3A3A3E",
  /** Placeholder / hint text — lighter than ink2 so empty fields don't look filled */
  inkMuted: "rgba(25, 25, 27, 0.38)",
  green: "#1B4D3E",
  green2: "#1E4136",
  green3: "#0F3D2F",
  marigold: "#EAAA00",
  marigold2: "#FFB900",
  coral: "#EB4F30",
  coralSoft: "rgba(255,42,0,0.15)",
  sage: "#53A268",
  sageSoft: "rgba(83,162,104,0.14)",
  line: "rgba(25,25,27,0.08)",
  line2: "rgba(25,25,27,0.14)",
  creamTranslucent: "rgba(248,249,244,0.12)",
  overlay: "rgba(0,0,0,0.5)",
} as const;

export type ColorToken = keyof typeof colors;
