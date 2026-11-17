// Shared by the parent's upload form and the teacher's review page.

export const PROOF_METHODS = {
  zelle: "Zelle",
  venmo: "Venmo",
  cash_app: "Cash App",
  paypal: "PayPal",
  bank: "Bank transfer",
  check: "Check",
  cash: "Cash",
  other: "Other",
} as const;
export type ProofMethod = keyof typeof PROOF_METHODS;

/** Cash and checks often have nothing to photograph; everything else needs a screenshot. */
export function proofImageRequired(method: string) {
  return method !== "cash" && method !== "check";
}

/** How a payment was made, for receipts and history. */
export function paymentMethodLabel(method: string) {
  if (method === "manual") return "Recorded by teacher";
  if (method === "card") return "Card, online";
  return PROOF_METHODS[method as ProofMethod] ?? method;
}

export const MAX_PROOF_BYTES = 3 * 1024 * 1024;
