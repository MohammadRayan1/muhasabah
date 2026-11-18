import type { Route } from "./+types/undo";
import { prisma } from "@/lib/prisma.server";
import { requireTeacher } from "@/lib/auth/session.server";
import { readUndo, withToast } from "@/lib/toast.server";

/** Put back what the Undo button's signed ticket describes. */
export async function action({ request }: Route.ActionArgs) {
  await requireTeacher(request);
  const undo = await readUndo(String((await request.formData()).get("ticket") ?? ""));
  if (!undo) return { error: "It's too late to undo that. You can still change it by hand." };

  switch (undo.kind) {
    case "student-archive":
      await prisma.student.update({ where: { id: undo.studentId }, data: { active: true } });
      break;

    case "program-archive":
      await prisma.program.update({ where: { id: undo.programId }, data: { active: true } });
      break;

    case "proof-approve": {
      const proof = await prisma.paymentProof.findUnique({ where: { id: undo.proofId } });
      if (!proof || proof.status !== "approved") return { error: "This payment was already changed." };
      await prisma.$transaction([
        prisma.payment.deleteMany({ where: { proofId: undo.proofId } }),
        prisma.paymentProof.update({ where: { id: undo.proofId }, data: { status: "pending", reviewedAt: null } }),
        ...undo.students.map((s) =>
          prisma.student.update({
            where: { id: s.id },
            data: { nextDueDate: new Date(s.nextDueDate), firstPaymentAmount: s.firstPaymentAmount },
          }),
        ),
      ]);
      break;
    }

    case "signup-approve": {
      await prisma.$transaction(async (tx) => {
        let familyId = undo.familyId;
        if (undo.removedFamily) {
          const family = await tx.family.create({ data: undo.removedFamily });
          familyId = family.id;
        }
        for (const s of undo.students) {
          await tx.student.update({
            where: { id: s.id },
            data: {
              pendingApproval: true,
              active: false,
              familyId,
              tuitionAmount: s.tuitionAmount,
              firstPaymentAmount: s.firstPaymentAmount,
              nextDueDate: new Date(s.nextDueDate),
            },
          });
        }
      });
      break;
    }
  }

  return withToast({ ok: true }, "Undone");
}
