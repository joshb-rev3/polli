/** Shared $1 gift + fee math used by checkout and start launch.
 * Processing/platform fees are always covered so the recipient gets the full $1.
 */

export const GIFT_CENTS = 100;
export const FEE_COVER_CENTS = 50;
export const PLATFORM_FEE_COVERED_CENTS = 10;
export const NET_COVERED_CENTS = 100;
export const KEEPSAKE_CENTS = 100;

export function dollars(cents: number) {
  return cents / 100;
}

export function formatDollars(cents: number) {
  return `$${dollars(cents).toFixed(2)}`;
}

/**
 * Amounts for a single Polli gift.
 * Optional voice keepsake is a separate $1 product (does not change recipient net).
 */
export function giftTotals(opts?: { keepsake?: boolean }) {
  const keepsakeCents = opts?.keepsake ? KEEPSAKE_CENTS : 0;
  const feeCents = FEE_COVER_CENTS;
  const netCents = NET_COVERED_CENTS;
  const platformFeeCents = PLATFORM_FEE_COVERED_CENTS;
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
