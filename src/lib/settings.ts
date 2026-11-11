import { prisma } from "@/lib/prisma";

const SETTINGS_ID = 1;
const DEFAULT_BILLING_DAY = 1;

export async function getBillingDay(): Promise<number> {
  const settings = await prisma.settings.findUnique({ where: { id: SETTINGS_ID } });
  return settings?.billingDay ?? DEFAULT_BILLING_DAY;
}

export async function setBillingDay(billingDay: number): Promise<void> {
  await prisma.settings.upsert({
    where: { id: SETTINGS_ID },
    create: { id: SETTINGS_ID, billingDay },
    update: { billingDay },
  });
}
