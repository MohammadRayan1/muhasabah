import { randomBytes } from "node:crypto";
import { redirect } from "react-router";
import { prisma } from "@/lib/prisma.server";
import {
  BILLING_DAY,
  calculateFirstBill,
  nextBillingDate,
  parseDateOnly,
  startOfDay,
} from "@/lib/dates";
import { monthBounds } from "@/lib/reports.server";
import { sendInviteEmail } from "@/lib/email.server";
import type { ActionState } from "@/lib/action-state";

// Teacher mutations. Every route action calls requireTeacher(request) before these.

function str(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export function appUrl() {
  return process.env.APP_URL ?? "http://localhost:5173";
}

export async function createStudent(formData: FormData): Promise<ActionState> {
  const name = str(formData, "name");
  const phone = str(formData, "phone");
  const email = str(formData, "email");
  const tuitionAmount = Number(formData.get("tuitionAmount"));
  const firstMonthPaid = formData.get("firstMonthPaid") === "on";
  const notes = str(formData, "notes");
  const priceNote = str(formData, "priceNote");
  const programIds = formData.getAll("programIds").map(String).filter(Boolean);

  if (!name) return { error: "Name is required" };
  if (!Number.isFinite(tuitionAmount) || tuitionAmount <= 0) {
    return { error: "Tuition amount must be a positive number" };
  }

  const joinedAtStr = str(formData, "joinedAt");
  if (joinedAtStr && !/^\d{4}-\d{2}-\d{2}$/.test(joinedAtStr)) {
    return { error: "Date joined must be a valid date" };
  }
  const joinedAt = joinedAtStr ? parseDateOnly(joinedAtStr) : startOfDay(new Date());
  if (Number.isNaN(joinedAt.getTime())) return { error: "Date joined must be a valid date" };

  const firstBill = calculateFirstBill(tuitionAmount, joinedAt);

  await prisma.$transaction(async (tx) => {
    const student = await tx.student.create({
      data: {
        name,
        phone: phone || null,
        email: email || null,
        tuitionAmount,
        // Set only when the first bill differs from a normal month (leftover days added on).
        firstPaymentAmount: firstBill.hasLeftover ? firstBill.total : null,
        priceNote: priceNote || null,
        billingDay: BILLING_DAY,
        nextDueDate: firstBill.dueDate,
        joinedAt,
        notes: notes || null,
      },
    });

    if (firstMonthPaid) {
      await tx.payment.create({
        data: { studentId: student.id, amount: firstBill.total },
      });
      await tx.student.update({
        where: { id: student.id },
        data: {
          nextDueDate: nextBillingDate(firstBill.dueDate),
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

  throw redirect("/");
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

  await prisma.program.create({ data: { name, days, time, location, price } });
  return { ok: true };
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

  await prisma.$transaction([
    prisma.payment.create({ data: { studentId, amount } }),
    prisma.student.update({
      where: { id: studentId },
      data: {
        nextDueDate: nextBillingDate(student.nextDueDate),
        firstPaymentAmount: null,
      },
    }),
  ]);

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
