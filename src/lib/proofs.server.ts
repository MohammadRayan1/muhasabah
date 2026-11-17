import { prisma } from "@/lib/prisma.server";
import { nextBillingDate, parseDateOnly } from "@/lib/dates";
import { visibleStudentIds } from "@/lib/access.server";
import { amountDue } from "@/lib/status";
import { MAX_PROOF_BYTES, PROOF_METHODS, proofImageRequired } from "@/lib/proofs";
import type { SessionPayload } from "@/lib/auth/session.server";
import type { ActionState } from "@/lib/action-state";

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function str(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

// ── Parent ───────────────────────────────────────────────────────────────────

export async function submitProof(session: SessionPayload, formData: FormData): Promise<ActionState> {
  const allowed = await visibleStudentIds(session);
  const studentIds = formData.getAll("studentIds").map(String).filter((id) => allowed.includes(id));
  const amount = Number(formData.get("amount"));
  const method = str(formData, "method");
  const paidOnStr = str(formData, "paidOn");
  const note = str(formData, "note");
  const file = formData.get("image");

  if (studentIds.length === 0) return { error: "Pick who this payment is for" };
  if (!Number.isFinite(amount) || amount <= 0) return { error: "Amount must be a positive number" };
  if (!(method in PROOF_METHODS)) return { error: "Pick how you paid" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(paidOnStr)) return { error: "Pick the date you paid" };

  const pending = await prisma.student.count({ where: { id: { in: studentIds }, pendingApproval: true } });
  if (pending > 0) return { error: "Your teacher hasn't confirmed this sign-up yet." };

  let image: Buffer | null = null;
  let imageType: string | null = null;
  if (file instanceof File && file.size > 0) {
    if (!IMAGE_TYPES.has(file.type)) return { error: "Please upload a photo or screenshot (JPG, PNG or WebP)" };
    if (file.size > MAX_PROOF_BYTES) return { error: "That image is too large. Please try a smaller screenshot." };
    image = Buffer.from(await file.arrayBuffer());
    imageType = file.type;
  } else if (proofImageRequired(method)) {
    return { error: "Please add a screenshot of the payment" };
  }

  await prisma.paymentProof.create({
    data: {
      studentIds,
      amount,
      method,
      paidOn: parseDateOnly(paidOnStr),
      note: note || null,
      image: image ? new Uint8Array(image) : null,
      imageType,
      submittedById: session.userId,
    },
  });
  return { ok: true, message: "Sent! Your teacher will check it and confirm." };
}

/** May this person see this proof's image? The teacher always; a parent only for their own children. */
export async function canSeeProof(session: SessionPayload, proof: { studentIds: string[] }) {
  if (session.role === "TEACHER") return true;
  const allowed = await visibleStudentIds(session);
  return proof.studentIds.some((id) => allowed.includes(id));
}

// ── Teacher ──────────────────────────────────────────────────────────────────

/**
 * Confirm a proof: record a payment for each child it covers (the teacher can
 * adjust each amount) and move each child's due date to the next 1st.
 */
export async function approveProof(formData: FormData): Promise<ActionState> {
  const proofId = str(formData, "proofId");
  const proof = await prisma.paymentProof.findUnique({ where: { id: proofId } });
  if (!proof || proof.status !== "pending") return { error: "This proof was already reviewed" };

  const students = await prisma.student.findMany({ where: { id: { in: proof.studentIds } } });
  if (students.length === 0) return { error: "Student not found" };

  const lines: { student: (typeof students)[number]; amount: number }[] = [];
  for (const student of students) {
    const fallback = students.length === 1 ? proof.amount : amountDue(student);
    const amount = Number(formData.get(`amount_${student.id}`) ?? fallback);
    if (!Number.isFinite(amount) || amount <= 0) return { error: "Amount must be a positive number" };
    lines.push({ student, amount });
  }

  await prisma.$transaction(async (tx) => {
    const claimed = await tx.paymentProof.updateMany({
      where: { id: proof.id, status: "pending" },
      data: { status: "approved", reviewedAt: new Date() },
    });
    if (claimed.count === 0) throw new Error("ALREADY_REVIEWED");
    for (const { student, amount } of lines) {
      await tx.payment.create({
        data: {
          studentId: student.id,
          amount,
          paidAt: proof.paidOn,
          method: proof.method,
          note: proof.note,
          proofId: proof.id,
        },
      });
      await tx.student.update({
        where: { id: student.id },
        data: { nextDueDate: nextBillingDate(student.nextDueDate), firstPaymentAmount: null },
      });
    }
  });
  return { ok: true };
}

export async function rejectProof(formData: FormData): Promise<ActionState> {
  const proofId = str(formData, "proofId");
  const reason = str(formData, "reason");
  const updated = await prisma.paymentProof.updateMany({
    where: { id: proofId, status: "pending" },
    data: { status: "rejected", rejectReason: reason || null, reviewedAt: new Date() },
  });
  if (updated.count === 0) return { error: "This proof was already reviewed" };
  return { ok: true };
}
