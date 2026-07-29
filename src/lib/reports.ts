import { prisma } from "@/lib/prisma";

export type MonthlyRevenue = {
  slug: string;
  label: string;
  expected: number;
  collected: number;
};

export type MonthDetailPayment = {
  id: string;
  studentId: string;
  studentName: string;
  studentActive: boolean;
  amount: number;
  paidAt: Date;
};

export type MonthDetailExpectedStudent = {
  id: string;
  name: string;
  active: boolean;
  tuitionAmount: number;
  paidThisMonth: boolean;
};

export type MonthDetail = {
  slug: string;
  label: string;
  expectedTotal: number;
  collectedTotal: number;
  payments: MonthDetailPayment[];
  expectedStudents: MonthDetailExpectedStudent[];
};

function monthSlug(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(date: Date) {
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(date);
}

function monthBounds(slug: string): { monthStart: Date; monthEnd: Date } {
  const [year, month] = slug.split("-").map(Number);
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);
  return { monthStart, monthEnd };
}

export async function getMonthlyRevenue(monthsBack: number = 6): Promise<MonthlyRevenue[]> {
  // Include inactive (removed) students too: a student who left after paying should
  // still count toward the months they were actually enrolled and billable for.
  const [students, payments] = await Promise.all([
    prisma.student.findMany({
      select: { tuitionAmount: true, joinedAt: true },
    }),
    prisma.payment.findMany({ select: { amount: true, paidAt: true } }),
  ]);

  const now = new Date();
  const months: MonthlyRevenue[] = [];

  for (let i = monthsBack - 1; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);

    const expected = students
      .filter((s) => s.joinedAt <= monthEnd)
      .reduce((sum, s) => sum + s.tuitionAmount, 0);

    const collected = payments
      .filter((p) => p.paidAt >= monthStart && p.paidAt <= monthEnd)
      .reduce((sum, p) => sum + p.amount, 0);

    months.push({ slug: monthSlug(monthStart), label: monthLabel(monthStart), expected, collected });
  }

  return months;
}

export async function getMonthDetail(slug: string): Promise<MonthDetail | null> {
  if (!/^\d{4}-\d{2}$/.test(slug)) return null;

  const { monthStart, monthEnd } = monthBounds(slug);

  const [payments, students] = await Promise.all([
    prisma.payment.findMany({
      where: { paidAt: { gte: monthStart, lte: monthEnd } },
      include: { student: { select: { id: true, name: true, active: true } } },
      orderBy: { paidAt: "asc" },
    }),
    prisma.student.findMany({
      where: { joinedAt: { lte: monthEnd } },
      select: { id: true, name: true, active: true, tuitionAmount: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const paidStudentIds = new Set(payments.map((p) => p.studentId));

  return {
    slug,
    label: monthLabel(monthStart),
    expectedTotal: students.reduce((sum, s) => sum + s.tuitionAmount, 0),
    collectedTotal: payments.reduce((sum, p) => sum + p.amount, 0),
    payments: payments.map((p) => ({
      id: p.id,
      studentId: p.studentId,
      studentName: p.student.name,
      studentActive: p.student.active,
      amount: p.amount,
      paidAt: p.paidAt,
    })),
    expectedStudents: students.map((s) => ({
      id: s.id,
      name: s.name,
      active: s.active,
      tuitionAmount: s.tuitionAmount,
      paidThisMonth: paidStudentIds.has(s.id),
    })),
  };
}
