import { prisma } from "@/lib/prisma";

export type MonthlyRevenue = {
  label: string;
  expected: number;
  collected: number;
};

function monthLabel(date: Date) {
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(date);
}

export async function getMonthlyRevenue(monthsBack: number = 6): Promise<MonthlyRevenue[]> {
  const [students, payments] = await Promise.all([
    prisma.student.findMany({
      where: { active: true },
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

    months.push({ label: monthLabel(monthStart), expected, collected });
  }

  return months;
}
