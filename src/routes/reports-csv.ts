import type { Route } from "./+types/reports-csv";
import { requireTeacher } from "@/lib/auth/session.server";
import { getYearPayments } from "@/lib/reports.server";
import { paymentMethodLabel } from "@/lib/proofs";

const cell = (v: string | number) => {
  const text = String(v);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/** All of a year's payments as a spreadsheet, e.g. for taxes or the masjid's books. */
export async function loader({ request }: Route.LoaderArgs) {
  await requireTeacher(request);
  const param = Number(new URL(request.url).searchParams.get("year"));
  const year = Number.isInteger(param) && param > 2000 && param < 3000 ? param : new Date().getFullYear();
  const payments = await getYearPayments(year);

  const rows = [
    ["Date", "Student", "Amount", "Method", "Receipt number", "Note"],
    ...payments.map((p) => [
      p.paidAt.toISOString().slice(0, 10),
      p.student.name,
      p.amount.toFixed(2),
      paymentMethodLabel(p.method),
      p.receiptNumber,
      p.note ?? "",
    ]),
  ];
  const csv = "\uFEFF" + rows.map((r) => r.map(cell).join(",")).join("\r\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="payments-${year}.csv"`,
    },
  });
}
