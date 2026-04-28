import { ViewStyle } from "react-native";

export const shadows = {
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 7, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 23.5,
    elevation: 8,
  } satisfies ViewStyle,
  feed: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 10,
  } satisfies ViewStyle,
  fab: {
    shadowColor: "rgba(234,170,0,0.4)",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 6,
  } satisfies ViewStyle,
  coralBtn: {
    shadowColor: "rgba(235,79,48,0.45)",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 8,
  } satisfies ViewStyle,
} as const;
