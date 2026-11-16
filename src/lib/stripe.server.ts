import Stripe from "stripe";
import { prisma } from "@/lib/prisma.server";
import { nextBillingDate } from "@/lib/dates";
import { amountDue } from "@/lib/status";
import { appUrl } from "@/lib/mutations.server";

// Online payments are optional: everything here stays off until STRIPE_SECRET_KEY is set.

export function stripeEnabled() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

function stripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}

/** A Stripe Checkout page for the student's next bill. Returns the URL to send the parent to. */
export async function createCheckout(studentId: string) {
  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student) throw new Error("Student not found");

  const amount = amountDue(student);
  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: Math.round(amount * 100),
          product_data: {
            name: `Tuition for ${student.name}`,
            description: `Due ${student.nextDueDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`,
          },
        },
      },
    ],
    metadata: { studentId: student.id, dueDate: student.nextDueDate.toISOString() },
    success_url: `${appUrl()}/portal?paid=1`,
    cancel_url: `${appUrl()}/portal`,
  });

  if (!session.url) throw new Error("Stripe didn't return a checkout link");
  return session.url;
}

/**
 * Stripe calls this when a checkout finishes. Records the payment once (the session id is
 * unique) and moves the due date on, but only if the bill that was paid is still the open one.
 */
export async function handleStripeWebhook(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  if (!secret || !signature) return new Response("Not configured", { status: 400 });

  let event: Stripe.Event;
  try {
    event = await stripe().webhooks.constructEventAsync(await request.text(), signature, secret);
  } catch {
    return new Response("Bad signature", { status: 400 });
  }

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data.object;
    if (session.payment_status === "paid" && session.metadata?.studentId) {
      await recordStripePayment(session);
    }
  }

  return new Response("ok");
}

async function recordStripePayment(session: Stripe.Checkout.Session) {
  const studentId = session.metadata!.studentId;
  const paidFor = session.metadata?.dueDate ? new Date(session.metadata.dueDate) : null;
  const amount = (session.amount_total ?? 0) / 100;

  const existing = await prisma.payment.findUnique({ where: { stripeSessionId: session.id } });
  if (existing) return;

  await prisma.$transaction(async (tx) => {
    const student = await tx.student.findUnique({ where: { id: studentId } });
    if (!student) return;

    await tx.payment.create({
      data: { studentId, amount, method: "card", stripeSessionId: session.id },
    });

    if (paidFor && student.nextDueDate.getTime() === paidFor.getTime()) {
      await tx.student.update({
        where: { id: studentId },
        data: { nextDueDate: nextBillingDate(student.nextDueDate), firstPaymentAmount: null },
      });
    }
  });
}
