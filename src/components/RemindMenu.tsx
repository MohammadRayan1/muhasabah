import { useFetcher } from "react-router";
import { BellRing, Mail, MessageCircle, MessageSquareText, Send } from "lucide-react";
import { reminderLinks } from "@/lib/reminders";
import type { ActionState } from "@/lib/action-state";
import { useT } from "@/lib/useT";

type Props = {
  student: Parameters<typeof reminderLinks>[0] & { id: string };
  /** Show "Email it for me" (needs Resend set up and an email on file). */
  canEmail?: boolean;
};

/**
 * One-tap reminders. WhatsApp and text open the teacher's own phone with the message
 * already written; nothing is sent until they press send there.
 */
export default function RemindMenu({ student, canEmail = false }: Props) {
  const t = useT();
  const links = reminderLinks(student);
  const fetcher = useFetcher<ActionState>();
  const item =
    "flex min-h-10 w-full items-center gap-2.5 rounded-lg px-3 text-start text-sm text-stone-700 hover:bg-stone-100";

  return (
    <details className="group relative">
      <summary className="flex h-10 cursor-pointer list-none items-center gap-1.5 rounded-xl border border-stone-300 bg-white px-3 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-50 [&::-webkit-details-marker]:hidden">
        <BellRing className="h-4 w-4" strokeWidth={2.25} />
        {t("Remind")}
      </summary>
      <div className="absolute end-0 z-20 mt-2 w-64 rounded-xl border border-stone-200 bg-white p-1.5 shadow-lg shadow-stone-900/10">
        <p className="px-3 pt-1.5 pb-2 text-xs leading-relaxed text-stone-500">&ldquo;{links.text}&rdquo;</p>
        <a href={links.whatsapp} target="_blank" rel="noreferrer" className={item}>
          <MessageCircle className="h-4 w-4 text-emerald-700" /> WhatsApp
        </a>
        {links.sms ? (
          <a href={links.sms} className={item}>
            <MessageSquareText className="h-4 w-4 text-stone-500" /> {t("Text message")}
          </a>
        ) : null}
        {links.email ? (
          <a href={links.email} className={item}>
            <Mail className="h-4 w-4 text-stone-500" /> {t("Open in my email")}
          </a>
        ) : null}
        {canEmail && links.email ? (
          <fetcher.Form method="post" action="/reminders">
            <input type="hidden" name="intent" value="sendEmail" />
            <input type="hidden" name="studentId" value={student.id} />
            <button type="submit" disabled={fetcher.state !== "idle"} className={item}>
              <Send className="h-4 w-4 text-stone-500" />
              {fetcher.state !== "idle" ? t("Sending…") : t("Email it for me")}
            </button>
          </fetcher.Form>
        ) : null}
        {fetcher.data?.error ? (
          <p role="alert" className="px-3 py-1.5 text-xs text-red-700">{t(fetcher.data.error)}</p>
        ) : fetcher.data?.message ? (
          <p className="px-3 py-1.5 text-xs text-emerald-700">{t(fetcher.data.message)}</p>
        ) : null}
      </div>
    </details>
  );
}
