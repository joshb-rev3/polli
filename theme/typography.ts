import { TextStyle } from "react-native";

export const fonts = {
  serif: "Fraunces_400Regular",
  serifMed: "Fraunces_500Medium",
  serifSemi: "Fraunces_600SemiBold",
  serifBold: "Fraunces_700Bold",
  serifItalic: "Fraunces_400Regular_Italic",
  serifHeavy: "Merriweather_900Black",
  serifHeavyBold: "Merriweather_700Bold",
  body: "Figtree_400Regular",
  bodyMed: "Figtree_500Medium",
  bodySemi: "Figtree_600SemiBold",
  bodyBold: "Figtree_700Bold",
  bodyExtra: "Figtree_800ExtraBold",
} as const;

export const type = {
  display: {
    fontFamily: fonts.serifHeavy,
    fontSize: 44,
    lineHeight: 44,
    letterSpacing: -0.44,
  } satisfies TextStyle,
  big: {
    fontFamily: fonts.serifSemi,
    fontSize: 34,
    lineHeight: 36,
    letterSpacing: -0.34,
  } satisfies TextStyle,
  section: {
    fontFamily: fonts.serifMed,
    fontSize: 28,
    lineHeight: 30,
  } satisfies TextStyle,
  tile: {
    fontFamily: fonts.serifSemi,
    fontSize: 20,
    lineHeight: 23,
  } satisfies TextStyle,
  lede: {
    fontFamily: fonts.serif,
    fontSize: 19,
    lineHeight: 26,
  } satisfies TextStyle,
  body: {
    fontFamily: fonts.body,
    fontSize: 16,
    lineHeight: 24,
  } satisfies TextStyle,
  bodySm: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
  } satisfies TextStyle,
  eyebrow: {
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.76,
    textTransform: "uppercase",
  } satisfies TextStyle,
  label: {
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.72,
    textTransform: "uppercase",
  } satisfies TextStyle,
  button: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    lineHeight: 20,
  } satisfies TextStyle,
} as const;
