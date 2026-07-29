import "server-only";
import { Resend } from "resend";

export async function sendInviteEmail(options: {
  to: string;
  studentName: string;
  inviteUrl: string;
}) {
  const { to, studentName, inviteUrl } = options;
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.log(`[invite email skipped — no RESEND_API_KEY set]\nTo: ${to}\nLink: ${inviteUrl}`);
    return { sent: false };
  }

  const resend = new Resend(apiKey);
  await resend.emails.send({
    from: "Muhasabah <onboarding@resend.dev>",
    to,
    subject: `You're invited to the ${studentName} tuition portal`,
    html: `
      <p>Assalamu alaikum,</p>
      <p>You've been invited to create an account to track tuition for <strong>${studentName}</strong>.</p>
      <p><a href="${inviteUrl}">Click here to set up your account</a></p>
      <p>This link expires in 7 days.</p>
    `,
  });

  return { sent: true };
}
