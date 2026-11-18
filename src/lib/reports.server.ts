import { prisma } from "@/lib/prisma.server";
import { amountDue } from "@/lib/status";
import { priceForDays } from "@/lib/pricing";

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
  method: string;
};

export type MonthDetailExpectedStudent = {
  id: string;
  name: string;
  active: boolean;
  tuitionAmount: number;
  paidThisMonth: boolean;
  paidAmount: number;
  /** paid: paid this month; ahead: paid for it earlier; first_bill: new, first bill not due yet; unpaid: owes. */
  standing: "paid" | "ahead" | "first_bill" | "unpaid";
  nextDueDate: Date;
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

export function monthBounds(slug: string): { monthStart: Date; monthEnd: Date } {
  const [year, month] = slug.split("-").map(Number);
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);
  return { monthStart, monthEnd };
}

export async function getMonthlyRevenue(monthsBack: number = 6): Promise<MonthlyRevenue[]> {
  // Include removed students too, but only for the months they were enrolled: up to
  // and including the month they were removed (tuition is due on the 1st).
  const [students, payments] = await Promise.all([
    prisma.student.findMany({
      where: { pendingApproval: false },
      select: { tuitionAmount: true, joinedAt: true, removedAt: true },
    }),
    prisma.payment.findMany({ select: { amount: true, paidAt: true } }),
  ]);

  const now = new Date();
  const months: MonthlyRevenue[] = [];

  for (let i = monthsBack - 1; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);

    const expected = students
      .filter((s) => s.joinedAt <= monthEnd && (!s.removedAt || s.removedAt >= monthStart))
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
      where: { joinedAt: { lte: monthEnd }, pendingApproval: false, OR: [{ removedAt: null }, { removedAt: { gte: monthStart } }] },
      select: { id: true, name: true, active: true, tuitionAmount: true, nextDueDate: true, firstPaymentAmount: true },
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
      method: p.method,
    })),
    expectedStudents: students.map((s) => ({
      id: s.id,
      name: s.name,
      active: s.active,
      tuitionAmount: s.tuitionAmount,
      paidThisMonth: paidStudentIds.has(s.id),
      paidAmount: payments.filter((p) => p.studentId === s.id).reduce((sum, p) => sum + p.amount, 0),
      // The due date only moves forward when a payment is recorded, so a due date after
      // this month means it's covered, unless it's a new student's first bill.
      standing: paidStudentIds.has(s.id)
        ? "paid"
        : s.nextDueDate > monthEnd
          ? s.firstPaymentAmount != null
            ? "first_bill"
            : "ahead"
          : "unpaid",
      nextDueDate: s.nextDueDate,
    })),
  };
}

export type RevenueOverview = Awaited<ReturnType<typeof getRevenueOverview>>;

/**
 * Everything the Revenue Reports page shows: the last 12 months, this month's
 * standing, who still owes for this month, and the year by program and by method.
 */
export async function getRevenueOverview() {
  const now = new Date();
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  const yearStart = new Date(now.getFullYear(), 0, 1);

  const [months, owing, programs, yearPayments] = await Promise.all([
    getMonthlyRevenue(12),
    // Owes for this month: an active student whose next due date has come or comes before the month ends.
    prisma.student.findMany({
      where: { active: true, pendingApproval: false, nextDueDate: { lte: monthEnd } },
      select: { id: true, name: true, nextDueDate: true, tuitionAmount: true, firstPaymentAmount: true },
      orderBy: { nextDueDate: "asc" },
    }),
    prisma.program.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      include: { enrollments: { where: { student: { active: true, pendingApproval: false } } } },
    }),
    prisma.payment.findMany({ where: { paidAt: { gte: yearStart } }, select: { amount: true, method: true } }),
  ]);

  const byMethod = new Map<string, number>();
  for (const p of yearPayments) byMethod.set(p.method, (byMethod.get(p.method) ?? 0) + p.amount);

  const billed = months.filter((m) => m.expected > 0 || m.collected > 0);

  return {
    months,
    year: now.getFullYear(),
    collectedThisYear: yearPayments.reduce((sum, p) => sum + p.amount, 0),
    monthlyAverage: billed.length ? billed.reduce((sum, m) => sum + m.collected, 0) / billed.length : 0,
    averageOver: billed.length,
    owing: owing.map((s) => ({ id: s.id, name: s.name, due: s.nextDueDate, amount: amountDue(s) })),
    programs: programs
      .map((p) => ({
        id: p.id,
        name: p.name,
        students: p.enrollments.length,
        monthly: p.enrollments.reduce((sum, e) => sum + priceForDays(p, e.daysPerWeek ?? p.daysPerWeek), 0),
      }))
      .sort((a, b) => b.monthly - a.monthly),
    methods: [...byMethod.entries()].map(([method, amount]) => ({ method, amount })).sort((a, b) => b.amount - a.amount),
  };
}

/** Every payment in a calendar year, oldest first, for the CSV download. */
export async function getYearPayments(year: number) {
  return prisma.payment.findMany({
    where: { paidAt: { gte: new Date(year, 0, 1), lt: new Date(year + 1, 0, 1) } },
    orderBy: { paidAt: "asc" },
    include: { student: { select: { name: true } } },
  });
}
