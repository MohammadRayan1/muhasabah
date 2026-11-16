import { formatCurrency, formatDate } from "@/lib/format";
import { amountDue, getPaymentStatus } from "@/lib/status";

/** Automatic emails go out this many days before the due date, and again this many days after. */
export const UPCOMING_DAYS = 3;
export const OVERDUE_DAYS = 3;

type RemindableStudent = {
  name: string;
  phone: string | null;
  email: string | null;
  tuitionAmount: number;
  firstPaymentAmount: number | null;
  nextDueDate: Date;
  family?: { phone: string | null; email: string | null; guardianName: string | null } | null;
};

/** Where to reach a student's family: the family contact first, then the student's own. */
export function reminderContact(student: RemindableStudent) {
  return {
    phone: student.family?.phone || student.phone || null,
    email: student.family?.email || student.email || null,
    greetingName: student.family?.guardianName || null,
  };
}

export function reminderMessage(student: RemindableStudent, today: Date = new Date()) {
  const { status, daysUntilDue } = getPaymentStatus(student.nextDueDate, today);
  const amount = formatCurrency(amountDue(student));
  const due = formatDate(student.nextDueDate);
  const { greetingName } = reminderContact(student);
  const hello = greetingName ? `Assalamu alaikum ${greetingName},` : "Assalamu alaikum,";

  const body =
    status === "overdue"
      ? `${student.name}'s tuition of ${amount} was due on ${due} (${Math.abs(daysUntilDue)} day${
          Math.abs(daysUntilDue) === 1 ? "" : "s"
        } ago). Please send it when you can.`
      : daysUntilDue === 0
        ? `a gentle reminder that ${student.name}'s tuition of ${amount} is due today.`
        : `a gentle reminder that ${student.name}'s tuition of ${amount} is due on ${due}.`;

  return `${hello} ${body} JazakAllahu khayran.`;
}

/** Digits only, for wa.me links. Assumes a US number when there's no country code. */
export function whatsappNumber(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `1${digits}`;
  return digits;
}

export function reminderLinks(student: RemindableStudent) {
  const { phone, email } = reminderContact(student);
  const text = reminderMessage(student);
  const encoded = encodeURIComponent(text);
  return {
    text,
    whatsapp: phone
      ? `https://wa.me/${whatsappNumber(phone)}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`,
    sms: phone ? `sms:${phone}?&body=${encoded}` : null,
    email: email
      ? `mailto:${email}?subject=${encodeURIComponent(`Tuition reminder for ${student.name}`)}&body=${encoded}`
      : null,
  };
}

export function receiptCode(receiptNumber: number) {
  return `MUH-${String(receiptNumber).padStart(5, "0")}`;
}
