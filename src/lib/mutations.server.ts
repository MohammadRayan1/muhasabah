import { randomBytes } from "node:crypto";
import { redirect } from "react-router";
import { prisma } from "@/lib/prisma.server";
import {
  nextBillingDate,
  parseDateOnly,
  startOfDay,
} from "@/lib/dates";
import { monthBounds } from "@/lib/reports.server";
import { sendInviteEmail, sendReceiptEmail } from "@/lib/email.server";
import { amountDue } from "@/lib/status";
import { receiptCode } from "@/lib/reminders";
import { formatCurrency, formatDate } from "@/lib/format";
import { SURAHS } from "@/lib/quran";
import type { ProgressKind } from "@/generated/prisma/client";
import type { ActionState } from "@/lib/action-state";

// Teacher mutations. Every route action calls requireTeacher(request) before these.

function str(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

/**
 * The site's address, for links we show or send. Prefer the address the page was
 * actually served from, then Netlify's own URL for the site, and APP_URL last, so a
 * mistyped APP_URL can't produce links to someone else's site.
 */
export function appUrl(request?: Request) {
  if (request) return new URL(request.url).origin;
  return (process.env.URL || process.env.APP_URL || "http://localhost:5173").replace(/\/+$/, "");
}

export async function createProgram(formData: FormData): Promise<ActionState> {
  const name = str(formData, "name");
  const days = str(formData, "days");
  const time = str(formData, "time");
  const location = str(formData, "location");
  const price = Number(formData.get("price"));

  if (!name) return { error: "Name is required" };
  if (!days) return { error: "Days is required" };
  if (!time) return { error: "Time is required" };
  if (!location) return { error: "Location is required" };
  if (!Number.isFinite(price) || price <= 0) {
    return { error: "Price must be a positive number" };
  }

  const daysPerWeek = Number(formData.get("daysPerWeek"));
  if (!Number.isInteger(daysPerWeek) || daysPerWeek < 1 || daysPerWeek > 7) {
    return { error: "Days a week must be between 1 and 7" };
  }
  const dayOptions = parseDayOptions(formData, daysPerWeek);

  await prisma.program.create({ data: { name, days, time, location, price, daysPerWeek, dayOptions } });
  return { ok: true };
}

/** Day counts the teacher ticked, kept within 1..daysPerWeek. The full schedule is always offered. */
function parseDayOptions(formData: FormData, daysPerWeek: number) {
  const picked = formData
    .getAll("dayOptions")
    .map(Number)
    .filter((d) => Number.isInteger(d) && d >= 1 && d < daysPerWeek);
  return [...new Set([...picked, daysPerWeek])].sort((a, b) => a - b);
}

/** Change a program's days a week, the day counts parents can choose, and its price. */
export async function updateProgramDays(formData: FormData): Promise<ActionState> {
  const programId = str(formData, "programId");
  const daysPerWeek = Number(formData.get("daysPerWeek"));
  const price = Number(formData.get("price"));
  if (!programId) return { error: "Missing program" };
  if (!Number.isInteger(daysPerWeek) || daysPerWeek < 1 || daysPerWeek > 7) {
    return { error: "Days a week must be between 1 and 7" };
  }
  if (!Number.isFinite(price) || price <= 0) return { error: "Price must be a positive number" };

  await prisma.program.update({
    where: { id: programId },
    data: { daysPerWeek, price, dayOptions: parseDayOptions(formData, daysPerWeek) },
  });
  return { ok: true, message: "Saved" };
}

export async function setProgramActive(formData: FormData): Promise<ActionState> {
  const programId = str(formData, "programId");
  const active = str(formData, "active") === "true";
  if (!programId) return { error: "Missing program" };

  await prisma.program.update({ where: { id: programId }, data: { active } });
  return { ok: true };
}

export async function recordPayment(formData: FormData): Promise<ActionState> {
  const studentId = str(formData, "studentId");
  const amount = Number(formData.get("amount"));

  if (!studentId) return { error: "Missing student" };
  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "Amount must be a positive number" };
  }

  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student) return { error: "Student not found" };

  const [payment] = await prisma.$transaction([
    prisma.payment.create({ data: { studentId, amount } }),
    prisma.student.update({
      where: { id: studentId },
      data: {
        nextDueDate: nextBillingDate(student.nextDueDate),
        firstPaymentAmount: null,
      },
    }),
  ]);

  return { ok: true, paymentId: payment.id };
}

/** Marks every listed sibling's current bill as paid, each for their own amount due. */
export async function recordFamilyPayment(formData: FormData): Promise<ActionState> {
  const familyId = str(formData, "familyId");
  const studentIds = formData.getAll("studentIds").map(String).filter(Boolean);
  if (!familyId || studentIds.length === 0) return { error: "Pick at least one student" };

  const students = await prisma.student.findMany({
    where: { id: { in: studentIds }, familyId, active: true },
  });

  await prisma.$transaction(
    students.flatMap((student) => [
      prisma.payment.create({ data: { studentId: student.id, amount: amountDue(student) } }),
      prisma.student.update({
        where: { id: student.id },
        data: { nextDueDate: nextBillingDate(student.nextDueDate), firstPaymentAmount: null },
      }),
    ]),
  );
  return { ok: true };
}

export async function emailReceipt(formData: FormData): Promise<ActionState> {
  const paymentId = str(formData, "paymentId");
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { student: { include: { family: true } } },
  });
  if (!payment) return { error: "Payment not found" };

  const to = payment.student.family?.email || payment.student.email;
  if (!to) return { error: "There's no email address for this student or their family." };

  const result = await sendReceiptEmail({
    to,
    studentName: payment.student.name,
    code: receiptCode(payment.receiptNumber),
    amount: formatCurrency(payment.amount),
    date: formatDate(payment.paidAt),
    receiptUrl: `${appUrl()}/receipts/${payment.id}`,
  });
  if (!result.sent) return { error: result.error };
  return { ok: true, message: `Receipt emailed to ${to}` };
}

function familyFields(formData: FormData) {
  return {
    name: str(formData, "name"),
    guardianName: str(formData, "guardianName") || null,
    phone: str(formData, "phone") || null,
    email: str(formData, "email") || null,
  };
}

export async function createFamily(formData: FormData): Promise<ActionState> {
  const data = familyFields(formData);
  if (!data.name) return { error: "Family name is required" };
  const family = await prisma.family.create({ data });
  throw redirect(`/families/${family.id}`);
}

export async function updateFamily(formData: FormData): Promise<ActionState> {
  const familyId = str(formData, "familyId");
  const data = familyFields(formData);
  if (!data.name) return { error: "Family name is required" };
  await prisma.family.update({ where: { id: familyId }, data });
  return { ok: true, message: "Saved" };
}

export async function deleteFamily(formData: FormData): Promise<ActionState> {
  const familyId = str(formData, "familyId");
  // Students stay; they're just no longer grouped.
  await prisma.family.delete({ where: { id: familyId } });
  throw redirect("/families");
}

export async function setStudentFamily(formData: FormData): Promise<ActionState> {
  const studentId = str(formData, "studentId");
  const familyId = str(formData, "familyId") || null;
  if (!studentId) return { error: "Missing student" };
  await prisma.student.update({ where: { id: studentId }, data: { familyId } });
  return { ok: true };
}

const PROGRESS_KIND_VALUES = ["SABAQ", "SABQI", "MANZIL", "NAZRA"] as const;

function optionalInt(formData: FormData, key: string) {
  const raw = str(formData, key);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 0 ? n : NaN;
}

export async function logProgress(formData: FormData): Promise<ActionState> {
  const studentId = str(formData, "studentId");
  const kind = str(formData, "kind") as ProgressKind;
  const surah = Number(formData.get("surah"));
  const fromAyah = optionalInt(formData, "fromAyah");
  const toAyah = optionalInt(formData, "toAyah");
  const quality = optionalInt(formData, "quality");
  const mistakes = optionalInt(formData, "mistakes");
  const note = str(formData, "note");
  const dateStr = str(formData, "date");

  if (!studentId) return { error: "Missing student" };
  if (!PROGRESS_KIND_VALUES.includes(kind as (typeof PROGRESS_KIND_VALUES)[number])) {
    return { error: "Pick sabaq, sabqi, manzil or nazra" };
  }
  if (!Number.isInteger(surah) || surah < 1 || surah > 114) return { error: "Pick a surah" };
  const ayat = SURAHS[surah - 1].ayat;
  for (const [label, value] of [["From ayah", fromAyah], ["To ayah", toAyah]] as const) {
    if (Number.isNaN(value) || (value !== null && (value < 1 || value > ayat))) {
      return { error: `${label} must be between 1 and ${ayat} for ${SURAHS[surah - 1].name}` };
    }
  }
  if (fromAyah && toAyah && toAyah < fromAyah) return { error: "To ayah can't be before from ayah" };
  if (Number.isNaN(mistakes)) return { error: "Mistakes must be a whole number" };
  if (quality !== null && ![1, 2, 3].includes(quality)) return { error: "Pick how it went" };
  if (dateStr && !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return { error: "Pick a valid date" };

  await prisma.progressEntry.create({
    data: {
      studentId,
      kind,
      surah,
      fromAyah,
      toAyah: toAyah ?? fromAyah,
      quality,
      mistakes,
      note: note || null,
      date: dateStr ? parseDateOnly(dateStr) : startOfDay(new Date()),
    },
  });
  return { ok: true };
}

export async function deleteProgress(formData: FormData): Promise<ActionState> {
  const entryId = str(formData, "entryId");
  const studentId = str(formData, "studentId");
  await prisma.progressEntry.deleteMany({ where: { id: entryId, studentId } });
  return { ok: true };
}

export async function resetMonthPayments(formData: FormData): Promise<ActionState> {
  const month = str(formData, "month");
  if (!/^\d{4}-\d{2}$/.test(month)) return { error: "Invalid month" };

  const { monthStart, monthEnd } = monthBounds(month);

  await prisma.payment.deleteMany({
    where: { paidAt: { gte: monthStart, lte: monthEnd } },
  });
  return { ok: true };
}

export async function setStudentActive(formData: FormData): Promise<ActionState> {
  const studentId = str(formData, "studentId");
  const active = str(formData, "active") === "true";
  if (!studentId) return { error: "Missing student" };

  await prisma.student.update({ where: { id: studentId }, data: { active } });
  return { ok: true };
}

export async function updateStudentPrograms(formData: FormData): Promise<ActionState> {
  const studentId = str(formData, "studentId");
  const tuitionAmount = Number(formData.get("tuitionAmount"));
  const programIds = formData.getAll("programIds").map(String).filter(Boolean);

  if (!studentId) return { error: "Missing student" };
  if (!Number.isFinite(tuitionAmount) || tuitionAmount <= 0) {
    return { error: "Tuition amount must be a positive number" };
  }

  const existingEnrollments = await prisma.enrollment.findMany({
    where: { studentId },
    select: { programId: true },
  });
  const existingProgramIds = new Set(existingEnrollments.map((e) => e.programId));
  const programIdSet = new Set(programIds);
  const toAdd = programIds.filter((programId) => !existingProgramIds.has(programId));
  const toRemove = [...existingProgramIds].filter((programId) => !programIdSet.has(programId));

  await prisma.$transaction([
    prisma.enrollment.deleteMany({
      where: { studentId, programId: { in: toRemove } },
    }),
    prisma.enrollment.createMany({
      data: toAdd.map((programId) => ({ studentId, programId })),
    }),
    prisma.student.update({
      where: { id: studentId },
      data: { tuitionAmount },
    }),
  ]);

  return { ok: true };
}

export async function createInvite(formData: FormData): Promise<ActionState> {
  const studentId = str(formData, "studentId");
  const email = str(formData, "email").toLowerCase();

  if (!studentId) return { error: "Missing student" };
  if (!email) return { error: "Email is required" };

  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student) return { error: "Student not found" };

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return { error: "An account with this email already exists" };
  }

  const token = randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await prisma.invite.create({
    data: { studentId, email, token, expiresAt },
  });

  await sendInviteEmail({
    to: email,
    studentName: student.name,
    inviteUrl: `${appUrl()}/invite/${token}`,
  });

  return { ok: true };
}
