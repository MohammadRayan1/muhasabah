import { Resend } from "resend";

// Resend's shared test sender only delivers to the Resend account's own address.
// To email parents, verify a domain in Resend and set EMAIL_FROM, e.g.
// "Muhasabah <tuition@yourdomain.com>".
const DEFAULT_FROM = "Muhasabah · محاسبة <onboarding@resend.dev>";

export function emailConfigured() {
  return Boolean(process.env.RESEND_API_KEY);
}

function escapeHtml(text: string) {
  return text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

async function send(options: { to: string; subject: string; html: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`[email skipped — no RESEND_API_KEY set]\nTo: ${options.to}\nSubject: ${options.subject}`);
    return { sent: false as const, error: "Email isn't set up yet (no RESEND_API_KEY)." };
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM || DEFAULT_FROM,
    ...options,
  });
  if (error) {
    console.error("[email failed]", error);
    return { sent: false as const, error: error.message };
  }
  return { sent: true as const };
}

export function sendInviteEmail(options: { to: string; studentName: string; inviteUrl: string }) {
  const { to, studentName, inviteUrl } = options;
  return send({
    to,
    subject: `You're invited to the ${studentName} tuition portal`,
    html: `
      <p>Assalamu alaikum,</p>
      <p>You've been invited to create an account to track tuition for <strong>${escapeHtml(studentName)}</strong>.</p>
      <p><a href="${inviteUrl}">Click here to set up your account</a></p>
      <p>This link expires in 7 days.</p>
    `,
  });
}

export function sendReminderEmail(options: { to: string; studentName: string; message: string; portalUrl: string }) {
  return send({
    to: options.to,
    subject: `Tuition reminder for ${options.studentName}`,
    html: `
      <p>${escapeHtml(options.message)}</p>
      <p><a href="${options.portalUrl}">See the bill in your portal</a></p>
    `,
  });
}

export function sendReceiptEmail(options: {
  to: string;
  studentName: string;
  code: string;
  amount: string;
  date: string;
  receiptUrl: string;
}) {
  return send({
    to: options.to,
    subject: `Receipt ${options.code} for ${options.studentName}`,
    html: `
      <p>Assalamu alaikum,</p>
      <p>We received <strong>${escapeHtml(options.amount)}</strong> for ${escapeHtml(options.studentName)}'s tuition on ${escapeHtml(options.date)}. JazakAllahu khayran.</p>
      <p>Receipt number: ${escapeHtml(options.code)}</p>
      <p><a href="${options.receiptUrl}">View or print the receipt</a></p>
    `,
  });
}
