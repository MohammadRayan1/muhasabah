import { prisma } from "@/lib/prisma.server";
import { emailConfigured, sendReminderEmail } from "@/lib/email.server";
import { appUrl } from "@/lib/mutations.server";
import { addDays, startOfDay } from "@/lib/dates";
import { OVERDUE_DAYS, reminderContact, reminderMessage, UPCOMING_DAYS } from "@/lib/reminders";


export async function getSettings() {
  return prisma.settings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
}

type Student = NonNullable<Awaited<ReturnType<typeof findStudent>>>;

function findStudent(id: string) {
  return prisma.student.findUnique({ where: { id }, include: { family: true } });
}

async function sendOne(student: Student, kind: string, { once }: { once: boolean }) {
  const { email } = reminderContact(student);
  if (!email) return { sent: false, error: "No email address for this student or their family." };

  const key = { studentId: student.id, dueDate: student.nextDueDate, kind, channel: "email" };

  if (once) {
    // Claim the reminder first so two runs can't both send it.
    const claimed = await prisma.reminder
      .create({ data: { ...key, sentTo: email } })
      .then(() => true)
      .catch(() => false);
    if (!claimed) return { sent: false, error: "Already sent" };
  }

  const result = await sendReminderEmail({
    to: email,
    studentName: student.name,
    message: reminderMessage(student),
    portalUrl: `${appUrl()}/portal`,
  });

  if (!result.sent) {
    if (once) {
      await prisma.reminder.delete({
        where: { studentId_dueDate_kind_channel: key },
      });
    }
    return result;
  }

  if (!once) {
    await prisma.reminder.upsert({
      where: { studentId_dueDate_kind_channel: key },
      update: { sentAt: new Date(), sentTo: email },
      create: { ...key, sentTo: email },
    });
  }
  return result;
}

/** The teacher pressed "Email reminder" for one student. */
export async function sendManualReminder(studentId: string) {
  const student = await findStudent(studentId);
  if (!student) return { sent: false, error: "Student not found" };
  return sendOne(student, "manual", { once: false });
}

/** Daily job: one email a few days before each due date, and one a few days after if still unpaid. */
export async function runAutoReminders(now: Date = new Date()) {
  const settings = await getSettings();
  if (!settings.autoEmailReminders) return { skipped: "Automatic reminders are turned off" };
  if (!emailConfigured()) return { skipped: "Email isn't set up (no RESEND_API_KEY)" };

  const today = startOfDay(now);
  const students = await prisma.student.findMany({
    where: {
      active: true,
      OR: [
        { nextDueDate: { gte: today, lte: addDays(today, UPCOMING_DAYS) } },
        { nextDueDate: { lte: addDays(today, -OVERDUE_DAYS) } },
      ],
    },
    include: { family: true },
  });

  const results: { student: string; kind: string; sent: boolean; error?: string }[] = [];
  for (const student of students) {
    const kind = student.nextDueDate >= today ? "upcoming" : "overdue";
    const result = await sendOne(student, kind, { once: true });
    if (result.error !== "Already sent") results.push({ student: student.name, kind, ...result });
  }
  return { results };
}
