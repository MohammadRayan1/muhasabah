import { prisma } from "@/lib/prisma.server";
import type { SessionPayload } from "@/lib/auth/session.server";

/**
 * The students a signed-in parent may see: their own linked student, plus that
 * student's siblings when they're grouped in a family.
 */
export async function visibleStudentIds(session: SessionPayload): Promise<string[]> {
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { student: { select: { id: true, familyId: true } } },
  });
  const student = user?.student;
  if (!student) return [];
  if (!student.familyId) return [student.id];
  const siblings = await prisma.student.findMany({
    where: { familyId: student.familyId, OR: [{ active: true }, { pendingApproval: true }] },
    select: { id: true },
  });
  return Array.from(new Set([student.id, ...siblings.map((s) => s.id)]));
}
