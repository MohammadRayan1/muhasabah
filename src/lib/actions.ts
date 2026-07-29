"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { addMonths, parseDateOnly, startOfDay } from "@/lib/dates";

export async function createStudent(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const tuitionAmount = Number(formData.get("tuitionAmount"));
  const firstMonthPaid = formData.get("firstMonthPaid") === "on";
  const nextDueDateRaw = String(formData.get("nextDueDate") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();

  if (!name) throw new Error("Name is required");
  if (!Number.isFinite(tuitionAmount) || tuitionAmount <= 0) {
    throw new Error("Tuition amount must be a positive number");
  }

  let nextDueDate: Date;
  if (firstMonthPaid) {
    nextDueDate = addMonths(startOfDay(new Date()), 1);
  } else {
    if (!nextDueDateRaw) {
      throw new Error("A valid next payment due date is required");
    }
    nextDueDate = parseDateOnly(nextDueDateRaw);
    if (Number.isNaN(nextDueDate.getTime())) {
      throw new Error("A valid next payment due date is required");
    }
  }

  await prisma.$transaction(async (tx) => {
    const student = await tx.student.create({
      data: {
        name,
        phone: phone || null,
        email: email || null,
        tuitionAmount,
        billingDay: nextDueDate.getDate(),
        nextDueDate,
        notes: notes || null,
      },
    });

    if (firstMonthPaid) {
      await tx.payment.create({
        data: { studentId: student.id, amount: tuitionAmount },
      });
    }
  });

  revalidatePath("/");
  redirect("/");
}

export async function recordPayment(formData: FormData) {
  const studentId = String(formData.get("studentId") ?? "");
  const amount = Number(formData.get("amount"));

  if (!studentId) throw new Error("Missing student");
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Amount must be a positive number");
  }

  const student = await prisma.student.findUniqueOrThrow({ where: { id: studentId } });

  await prisma.$transaction([
    prisma.payment.create({ data: { studentId, amount } }),
    prisma.student.update({
      where: { id: studentId },
      data: { nextDueDate: addMonths(student.nextDueDate, 1) },
    }),
  ]);

  revalidatePath("/");
}

export async function setStudentActive(formData: FormData) {
  const studentId = String(formData.get("studentId") ?? "");
  const active = String(formData.get("active") ?? "") === "true";

  if (!studentId) throw new Error("Missing student");

  await prisma.student.update({ where: { id: studentId }, data: { active } });

  revalidatePath("/");
}
