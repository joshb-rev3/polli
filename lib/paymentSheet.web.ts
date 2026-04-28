// Web build has no Stripe RN SDK — simulate success so design QA in the browser still works.
export async function payWithStripe(_opts: any): Promise<"succeeded" | "canceled"> {
  await new Promise((r) => setTimeout(r, 800));
  return "succeeded";
}
