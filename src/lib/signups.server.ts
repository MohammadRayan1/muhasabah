import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma.server";
import { hashPassword } from "@/lib/auth/password.server";
import { BILLING_DAY, calculateFirstBill, parseDateOnly } from "@/lib/dates";
import type { ActionState } from "@/lib/action-state";
import { MAX_CHILDREN } from "@/lib/signups";
import { dayChoices, priceForDays } from "@/lib/pricing";

const LINK_DAYS = 30;
export { MAX_CHILDREN };

function str(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

/**
 * A link is usable if it exists, hasn't been used, and hasn't expired. Parents can
 * pick from every active program (older links may be limited to the ones they named).
 */
export async function findOpenLink(token: string) {
  const link = await prisma.signupLink.findUnique({ where: { token } });
  if (!link || link.usedAt || link.expiresAt < new Date()) return null;
  const programs = await prisma.program.findMany({
    where: { active: true, ...(link.programIds.length > 0 ? { id: { in: link.programIds } } : {}) },
    orderBy: { createdAt: "asc" },
  });
  return { link, programs };
}

// ── Teacher ──────────────────────────────────────────────────────────────────

export async function createSignupLink(formData: FormData): Promise<ActionState> {
  const label = str(formData, "label");
  if ((await prisma.program.count({ where: { active: true } })) === 0) {
    return { error: "Add a program first, so parents have something to pick" };
  }

  await prisma.signupLink.create({
    data: {
      token: randomBytes(9).toString("base64url"),
      label: label || null,
      programIds: [],
      expiresAt: new Date(Date.now() + LINK_DAYS * 24 * 60 * 60 * 1000),
    },
  });
  return { ok: true, message: "Link created. Copy it or send it on WhatsApp below." };
}

export async function revokeSignupLink(formData: FormData): Promise<ActionState> {
  await prisma.signupLink.deleteMany({ where: { id: str(formData, "linkId"), usedAt: null } });
  return { ok: true };
}

/**
 * Approve a family's pending children. The teacher can change each child's price;
 * the first bill is worked out again from the start date the parent picked.
 */
export async function approveSignup(formData: FormData): Promise<ActionState> {
  const familyId = str(formData, "familyId");
  const pending = await prisma.student.findMany({ where: { familyId, pendingApproval: true } });
  if (pending.length === 0) return { error: "Nothing waiting for this family" };

  const updates = [];
  for (const student of pending) {
    const price = Number(formData.get(`price_${student.id}`) ?? student.tuitionAmount);
    if (!Number.isFinite(price) || price <= 0) return { error: `Price for ${student.name} must be a positive number` };
    const bill = calculateFirstBill(price, student.joinedAt);
    updates.push(
      prisma.student.update({
        where: { id: student.id },
        data: {
          pendingApproval: false,
          active: true,
          tuitionAmount: price,
          firstPaymentAmount: bill.hasLeftover ? bill.total : null,
          nextDueDate: bill.dueDate,
        },
      }),
    );
  }
  await prisma.$transaction(updates);
  return { ok: true };
}

/** Decline: remove the pending children, the parent's login, and the family if it's now empty. */
export async function declineSignup(formData: FormData): Promise<ActionState> {
  const familyId = str(formData, "familyId");
  await prisma.$transaction(async (tx) => {
    const pending = await tx.student.findMany({
      where: { familyId, pendingApproval: true },
      select: { id: true },
    });
    const ids = pending.map((s) => s.id);
    await tx.user.deleteMany({ where: { studentId: { in: ids }, role: "MEMBER" } });
    await tx.student.deleteMany({ where: { id: { in: ids } } });
    const remaining = await tx.student.count({ where: { familyId } });
    if (remaining === 0) await tx.family.deleteMany({ where: { id: familyId } });
  });
  return { ok: true };
}

// ── Parent ───────────────────────────────────────────────────────────────────

type SubmitResult = { error: string } | { userId: string };

export async function submitSignup(token: string, formData: FormData): Promise<SubmitResult> {
  const open = await findOpenLink(token);
  if (!open) return { error: "This sign-up link has already been used or has expired. Ask your teacher for a new one." };
  const { link, programs } = open;

  const guardianName = str(formData, "guardianName");
  const phone = str(formData, "phone");
  const email = str(formData, "email").toLowerCase();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  const names = formData.getAll("childName").map((n) => String(n).trim());
  const programPicks = formData.getAll("childProgram").map(String);
  const dayPicks = formData.getAll("childDays").map(Number);
  const startStr = str(formData, "joinedAt");

  if (!guardianName) return { error: "Please enter your name" };
  if (!phone && !email) return { error: "Please enter a phone number or email" };
  if (!email) return { error: "Please enter your email. You'll use it to sign in." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "That email doesn't look right" };
  if (password.length < 8) return { error: "Password must be at least 8 characters" };
  if (password !== confirmPassword) return { error: "Passwords don't match" };
  if (programs.length === 0) return { error: "There are no programs to join right now. Ask your teacher." };
  if (names.filter(Boolean).length === 0) return { error: "Add at least one child" };
  if (names.length > MAX_CHILDREN) return { error: `You can add up to ${MAX_CHILDREN} children` };

  // Each child picks one program and how many days a week. The price is worked out
  // here from the program, never taken from the form.
  const children: { name: string; programId: string; days: number; price: number }[] = [];
  for (const [i, name] of names.entries()) {
    if (!name) return { error: `Enter a name for child ${i + 1}` };
    const program = programs.find((p) => p.id === programPicks[i]);
    if (!program) return { error: `Pick a program for ${name}` };
    const days = dayPicks[i];
    if (!dayChoices(program).includes(days)) return { error: `Pick how many days a week ${name} will come` };
    children.push({ name, programId: program.id, days, price: priceForDays(program, days) });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startStr)) return { error: "Pick a start date" };

  if (await prisma.user.findUnique({ where: { email } })) {
    return { error: "There's already an account with this email. Sign in instead, or use a different email." };
  }

  const joinedAt = parseDateOnly(startStr);
  const passwordHash = await hashPassword(password);
  const familyName = link.label || `${guardianName.split(/\s+/).at(-1)} family`;

  try {
    const userId = await prisma.$transaction(async (tx) => {
      // Claim the link first so two submissions can't both use it.
      const claimed = await tx.signupLink.updateMany({
        where: { id: link.id, usedAt: null },
        data: { usedAt: new Date() },
      });
      if (claimed.count === 0) throw new Error("LINK_USED");

      const family = await tx.family.create({
        data: { name: familyName, guardianName, phone: phone || null, email },
      });

      const studentIds: string[] = [];
      for (const child of children) {
        const bill = calculateFirstBill(child.price, joinedAt);
        const program = programs.find((p) => p.id === child.programId)!;
        const student = await tx.student.create({
          data: {
            name: child.name,
            familyId: family.id,
            phone: phone || null,
            email,
            tuitionAmount: child.price,
            firstPaymentAmount: bill.hasLeftover ? bill.total : null,
            billingDay: BILLING_DAY,
            nextDueDate: bill.dueDate,
            joinedAt,
            active: false,
            pendingApproval: true,
            enrollments: {
              create: {
                programId: child.programId,
                daysPerWeek: child.days < program.daysPerWeek ? child.days : null,
              },
            },
          },
        });
        studentIds.push(student.id);
      }

      await tx.signupLink.update({ where: { id: link.id }, data: { familyId: family.id } });

      const user = await tx.user.create({
        data: { email, passwordHash, role: "MEMBER", studentId: studentIds[0] },
      });
      return user.id;
    });
    return { userId };
  } catch (error) {
    if (error instanceof Error && error.message === "LINK_USED") {
      return { error: "This sign-up link has just been used. Ask your teacher for a new one." };
    }
    throw error;
  }
}
