"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { calculateProration, nextOccurrenceOfDay, parseDateOnly, startOfDay } from "@/lib/dates";
import { monthBounds } from "@/lib/reports";
import { getBillingDay, setBillingDay } from "@/lib/settings";
import { requireTeacher } from "@/lib/auth/dal";
import { sendInviteEmail } from "@/lib/email";
import type { ActionState } from "@/lib/action-state";

export async function createStudent(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireTeacher();

  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const tuitionAmount = Number(formData.get("tuitionAmount"));
  const firstMonthPaid = formData.get("firstMonthPaid") === "on";
  const notes = String(formData.get("notes") ?? "").trim();
  const priceNote = String(formData.get("priceNote") ?? "").trim();
  const programIds = formData.getAll("programIds").map(String).filter(Boolean);

  if (!name) return { error: "Name is required" };
  if (!Number.isFinite(tuitionAmount) || tuitionAmount <= 0) {
    return { error: "Tuition amount must be a positive number" };
  }

  const joinedAtStr = String(formData.get("joinedAt") ?? "").trim();
  if (joinedAtStr && !/^\d{4}-\d{2}-\d{2}$/.test(joinedAtStr)) {
    return { error: "Date joined must be a valid date" };
  }
  const joinedAt = joinedAtStr ? parseDateOnly(joinedAtStr) : startOfDay(new Date());
  if (Number.isNaN(joinedAt.getTime())) return { error: "Date joined must be a valid date" };

  const billingDay = await getBillingDay();
  const { nextDueDate, amount: proratedAmount, isProrated } = calculateProration(
    tuitionAmount,
    joinedAt,
    billingDay,
  );

  await prisma.$transaction(async (tx) => {
    const student = await tx.student.create({
      data: {
        name,
        phone: phone || null,
        email: email || null,
        tuitionAmount,
        firstPaymentAmount: isProrated ? proratedAmount : null,
        priceNote: priceNote || null,
        billingDay,
        nextDueDate,
        joinedAt,
        notes: notes || null,
      },
    });

    if (firstMonthPaid) {
      await tx.payment.create({
        data: { studentId: student.id, amount: isProrated ? proratedAmount : tuitionAmount },
      });
      await tx.student.update({
        where: { id: student.id },
        data: {
          nextDueDate: nextOccurrenceOfDay(billingDay, nextDueDate),
          firstPaymentAmount: null,
        },
      });
    }

    if (programIds.length > 0) {
      await tx.enrollment.createMany({
        data: programIds.map((programId) => ({ studentId: student.id, programId })),
      });
    }
  });

  revalidatePath("/");
  redirect("/");
}

export async function createProgram(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireTeacher();

  const name = String(formData.get("name") ?? "").trim();
  const days = String(formData.get("days") ?? "").trim();
  const time = String(formData.get("time") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const price = Number(formData.get("price"));

  if (!name) return { error: "Name is required" };
  if (!days) return { error: "Days is required" };
  if (!time) return { error: "Time is required" };
  if (!location) return { error: "Location is required" };
  if (!Number.isFinite(price) || price <= 0) {
    return { error: "Price must be a positive number" };
  }

  await prisma.program.create({ data: { name, days, time, location, price } });

  revalidatePath("/programs");
  revalidatePath("/students/new");
  redirect("/programs");
}

export async function setProgramActive(formData: FormData) {
  await requireTeacher();

  const programId = String(formData.get("programId") ?? "");
  const active = String(formData.get("active") ?? "") === "true";

  if (!programId) throw new Error("Missing program");

  await prisma.program.update({ where: { id: programId }, data: { active } });

  revalidatePath("/programs");
  revalidatePath("/students/new");
}

export async function recordPayment(formData: FormData) {
  await requireTeacher();

  const studentId = String(formData.get("studentId") ?? "");
  const amount = Number(formData.get("amount"));

  if (!studentId) throw new Error("Missing student");
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Amount must be a positive number");
  }

  const student = await prisma.student.findUniqueOrThrow({ where: { id: studentId } });
  const billingDay = await getBillingDay();

  await prisma.$transaction([
    prisma.payment.create({ data: { studentId, amount } }),
    prisma.student.update({
      where: { id: studentId },
      data: {
        nextDueDate: nextOccurrenceOfDay(billingDay, student.nextDueDate),
        firstPaymentAmount: null,
      },
    }),
  ]);

  revalidatePath("/");
}

export async function updateBillingDay(formData: FormData) {
  await requireTeacher();

  const billingDay = Number(formData.get("billingDay"));
  if (!Number.isInteger(billingDay) || billingDay < 1 || billingDay > 31) {
    throw new Error("Billing day must be a whole number between 1 and 31");
  }

  await setBillingDay(billingDay);

  revalidatePath("/settings");
  revalidatePath("/");
}

export async function resetMonthPayments(formData: FormData) {
  await requireTeacher();

  const month = String(formData.get("month") ?? "");
  if (!/^\d{4}-\d{2}$/.test(month)) throw new Error("Invalid month");

  const { monthStart, monthEnd } = monthBounds(month);

  await prisma.payment.deleteMany({
    where: { paidAt: { gte: monthStart, lte: monthEnd } },
  });

  revalidatePath(`/reports/${month}`);
  revalidatePath("/reports");
  revalidatePath("/");
}

export async function setStudentActive(formData: FormData) {
  await requireTeacher();

  const studentId = String(formData.get("studentId") ?? "");
  const active = String(formData.get("active") ?? "") === "true";

  if (!studentId) throw new Error("Missing student");

  await prisma.student.update({ where: { id: studentId }, data: { active } });

  revalidatePath("/");
}

export async function updateStudentPrograms(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireTeacher();

  const studentId = String(formData.get("studentId") ?? "");
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

  revalidatePath(`/students/${studentId}`);
  revalidatePath("/");
  return {};
}

export async function createInvite(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireTeacher();

  const studentId = String(formData.get("studentId") ?? "");
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  if (!studentId) return { error: "Missing student" };
  if (!email) return { error: "Email is required" };

  const student = await prisma.student.findUniqueOrThrow({ where: { id: studentId } });

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return { error: "An account with this email already exists" };
  }

  const token = randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await prisma.invite.create({
    data: { studentId, email, token, expiresAt },
  });

  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const inviteUrl = `${appUrl}/invite/${token}`;

  await sendInviteEmail({ to: email, studentName: student.name, inviteUrl });

  revalidatePath(`/students/${studentId}`);
  return {};
}
