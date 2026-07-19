import React, { createContext, useContext, useMemo, useState } from "react";

/** Simulated nomination that closed — Apple demo users land with this balance. */
export const DEMO_PAYOUT_CENTS = 4700; // $47.00
export const DEMO_NOMINATION_FROM = "Miranda Bauer";
export const DEMO_NOMINATION_REASON = "Amazing Teacher";

export type GiftCardBrand = {
  id: string;
  name: string;
  emoji: string;
  tint: string;
};

export const GIFT_CARD_BRANDS: GiftCardBrand[] = [
  { id: "amazon", name: "Amazon", emoji: "📦", tint: "#FF9900" },
  { id: "target", name: "Target", emoji: "🎯", tint: "#CC0000" },
  { id: "starbucks", name: "Starbucks", emoji: "☕", tint: "#00704A" },
  { id: "apple", name: "Apple", emoji: "🍎", tint: "#555555" },
  { id: "visa", name: "Visa prepaid", emoji: "💳", tint: "#1A1F71" },
];

export type DemoPayoutMethod = "cashout" | "giftcard" | null;

export interface DemoWalletState {
  balanceCents: number;
  lifetimeReceivedCents: number;
  lifetimeCashedOutCents: number;
  lifetimeGiftcardCents: number;
  connectReady: boolean;
  lastMethod: DemoPayoutMethod;
  lastBrand: string | null;
  lastAmountCents: number;
  seedForAppleDemo: () => void;
  markConnectReady: () => void;
  simulateCashout: (amountCents?: number) => { amountCents: number };
  simulateGiftCard: (brandId: string, amountCents?: number) => { amountCents: number; brand: GiftCardBrand };
  reset: () => void;
}

const DemoWalletContext = createContext<DemoWalletState | null>(null);

const empty = {
  balanceCents: 0,
  lifetimeReceivedCents: 0,
  lifetimeCashedOutCents: 0,
  lifetimeGiftcardCents: 0,
  connectReady: false,
  lastMethod: null as DemoPayoutMethod,
  lastBrand: null as string | null,
  lastAmountCents: 0,
};

export function DemoWalletProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState(empty);

  const api = useMemo<DemoWalletState>(
    () => ({
      ...state,
      seedForAppleDemo: () => {
        setState({
          balanceCents: DEMO_PAYOUT_CENTS,
          lifetimeReceivedCents: DEMO_PAYOUT_CENTS,
          lifetimeCashedOutCents: 0,
          lifetimeGiftcardCents: 0,
          connectReady: false,
          lastMethod: null,
          lastBrand: null,
          lastAmountCents: 0,
        });
      },
      markConnectReady: () => setState((s) => ({ ...s, connectReady: true })),
      simulateCashout: (amountCents) => {
        let amount = amountCents ?? 0;
        setState((s) => {
          amount = amountCents ?? s.balanceCents;
          return {
            ...s,
            balanceCents: Math.max(0, s.balanceCents - amount),
            lifetimeCashedOutCents: s.lifetimeCashedOutCents + amount,
            lastMethod: "cashout",
            lastBrand: null,
            lastAmountCents: amount,
            connectReady: true,
          };
        });
        return { amountCents: amount };
      },
      simulateGiftCard: (brandId, amountCents) => {
        const brand = GIFT_CARD_BRANDS.find((b) => b.id === brandId) ?? GIFT_CARD_BRANDS[0];
        let amount = amountCents ?? 0;
        setState((s) => {
          amount = amountCents ?? s.balanceCents;
          return {
            ...s,
            balanceCents: Math.max(0, s.balanceCents - amount),
            lifetimeGiftcardCents: s.lifetimeGiftcardCents + amount,
            lastMethod: "giftcard",
            lastBrand: brand.name,
            lastAmountCents: amount,
          };
        });
        return { amountCents: amount, brand };
      },
      reset: () => setState(empty),
    }),
    [state],
  );

  return <DemoWalletContext.Provider value={api}>{children}</DemoWalletContext.Provider>;
}

export function useDemoWallet() {
  const ctx = useContext(DemoWalletContext);
  if (!ctx) throw new Error("useDemoWallet must be used within DemoWalletProvider");
  return ctx;
}

export function formatCents(cents: number) {
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}
