/** Shared $1 gift + optional fee-cover math used by checkout and nominate launch. */

export const GIFT_CENTS = 100;
export const FEE_COVER_CENTS = 43;
export const PLATFORM_FEE_COVERED_CENTS = 10;
export const PLATFORM_FEE_UNCOVERED_CENTS = 7;
export const NET_COVERED_CENTS = 100;
export const NET_UNCOVERED_CENTS = 57;
export const KEEPSAKE_CENTS = 100;

export function dollars(cents: number) {
  return cents / 100;
}

export function formatDollars(cents: number) {
  return `$${dollars(cents).toFixed(2)}`;
}

/**
 * Amounts for a single Polli gift.
 * Optional voice keepsake is a separate $1 product (does not change nominee net).
 */
export function giftTotals(coverFees: boolean, opts?: { keepsake?: boolean }) {
  const keepsakeCents = opts?.keepsake ? KEEPSAKE_CENTS : 0;
  const feeCents = coverFees ? FEE_COVER_CENTS : 0;
  const netCents = coverFees ? NET_COVERED_CENTS : NET_UNCOVERED_CENTS;
  const platformFeeCents = coverFees
    ? PLATFORM_FEE_COVERED_CENTS
    : PLATFORM_FEE_UNCOVERED_CENTS;
  const totalCents = GIFT_CENTS + feeCents + keepsakeCents;

  return {
    giftCents: GIFT_CENTS,
    feeCents,
    keepsakeCents,
    netCents,
    platformFeeCents,
    totalCents,
  };
}
