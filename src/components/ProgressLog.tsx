import { useEffect, useRef, useState } from "react";
import { useFetcher } from "react-router";
import { Trash2 } from "lucide-react";
import { describePassage, PROGRESS_KINDS, QUALITY_LABELS, SURAHS, type ProgressKindKey } from "@/lib/quran";
import { formatDate } from "@/lib/format";
import { toDateInputValue } from "@/lib/dates";
import type { ActionState } from "@/lib/action-state";
import FormError from "@/components/FormError";
import { card, input, label, primaryButton } from "@/components/ui";

export type ProgressItem = {
  id: string;
  date: Date;
  kind: ProgressKindKey;
  surah: number;
  fromAyah: number | null;
  toAyah: number | null;
  quality: number | null;
  mistakes: number | null;
  note: string | null;
};

const QUALITY_STYLES: Record<number, string> = {
  3: "border-emerald-200 bg-emerald-50 text-emerald-700",
  2: "border-stone-200 bg-stone-50 text-stone-600",
  1: "border-amber-200 bg-amber-50 text-amber-700",
};

/** Where the student is now: the latest entry of each kind. */
export function ProgressSummary({ entries }: { entries: ProgressItem[] }) {
  const latest = (Object.keys(PROGRESS_KINDS) as ProgressKindKey[])
    .map((kind) => entries.find((e) => e.kind === kind))
    .filter((e): e is ProgressItem => Boolean(e));
  if (latest.length === 0) return null;

  return (
    <dl className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {latest.map((e) => (
        <div key={e.kind} className="rounded-xl border border-stone-200 bg-stone-50 p-3">
          <dt className="text-xs font-semibold text-stone-500">
            {PROGRESS_KINDS[e.kind].label} · {formatDate(e.date)}
          </dt>
          <dd className="mt-1 text-sm font-semibold text-stone-900">{describePassage(e.surah, e.fromAyah, e.toAyah)}</dd>
        </div>
      ))}
    </dl>
  );
}

export function ProgressList({ entries, canDelete }: { entries: ProgressItem[]; canDelete?: boolean }) {
  const fetcher = useFetcher();
  if (entries.length === 0) return <p className="text-sm text-stone-500">Nothing logged yet.</p>;

  return (
    <ul className="divide-y divide-stone-200 rounded-2xl border border-stone-200 bg-white shadow-sm shadow-stone-900/5">
      {entries.map((e) => (
        <li key={e.id} className="flex items-start gap-3 px-4 py-3">
          <span className="w-16 shrink-0 pt-0.5 text-xs font-semibold text-stone-500">{PROGRESS_KINDS[e.kind].label}</span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-stone-900">{describePassage(e.surah, e.fromAyah, e.toAyah)}</p>
            <p className="text-xs text-stone-500">
              {formatDate(e.date)}
              {e.mistakes != null ? ` · ${e.mistakes} mistake${e.mistakes === 1 ? "" : "s"}` : ""}
              {e.note ? ` · ${e.note}` : ""}
            </p>
          </div>
          {e.quality ? (
            <span className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${QUALITY_STYLES[e.quality]}`}>
              {QUALITY_LABELS[e.quality]}
            </span>
          ) : null}
          {canDelete ? (
            <fetcher.Form method="post">
              <input type="hidden" name="intent" value="deleteProgress" />
              <input type="hidden" name="entryId" value={e.id} />
              <button type="submit" aria-label="Delete entry" className="rounded-lg p-1.5 text-stone-400 hover:bg-red-50 hover:text-red-700">
                <Trash2 className="h-4 w-4" />
              </button>
            </fetcher.Form>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

/** Teacher's quick log after each lesson. Remembers the last surah so the next entry is fast. */
export function ProgressForm({ lastSurah }: { lastSurah?: number }) {
  const fetcher = useFetcher<ActionState>();
  const formRef = useRef<HTMLFormElement>(null);
  const [surah, setSurah] = useState(lastSurah ?? 1);
  const ayat = SURAHS[surah - 1].ayat;
  const pending = fetcher.state !== "idle";

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.ok) {
      const form = formRef.current;
      if (!form) return;
      for (const name of ["fromAyah", "toAyah", "mistakes", "note"]) {
        const el = form.elements.namedItem(name);
        if (el instanceof HTMLInputElement) el.value = "";
      }
    }
  }, [fetcher.state, fetcher.data]);

  return (
    <fetcher.Form ref={formRef} method="post" className={`${card} space-y-4`}>
      <input type="hidden" name="intent" value="logProgress" />
      <FormError message={fetcher.data?.error} />

      <fieldset>
        <legend className={label}>What did they recite?</legend>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {(Object.keys(PROGRESS_KINDS) as ProgressKindKey[]).map((kind, i) => (
            <label key={kind} className="cursor-pointer">
              <input type="radio" name="kind" value={kind} defaultChecked={i === 0} className="peer sr-only" />
              <span className="flex flex-col rounded-xl border border-stone-300 px-3 py-1.5 text-sm peer-checked:border-emerald-600 peer-checked:bg-emerald-50 peer-checked:text-emerald-700 peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-600">
                <span className="font-semibold">{PROGRESS_KINDS[kind].label}</span>
                <span className="text-xs text-stone-500">{PROGRESS_KINDS[kind].hint}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-[2fr_1fr_1fr]">
        <div>
          <label htmlFor="surah" className={label}>
            Surah
          </label>
          <select id="surah" name="surah" value={surah} onChange={(e) => setSurah(Number(e.target.value))} className={input}>
            {SURAHS.map((s, i) => (
              <option key={s.name} value={i + 1}>
                {i + 1}. {s.name} ({s.arabic})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="fromAyah" className={label}>
            From ayah
          </label>
          <input id="fromAyah" name="fromAyah" type="number" min={1} max={ayat} placeholder="1" className={input} />
        </div>
        <div>
          <label htmlFor="toAyah" className={label}>
            To ayah
          </label>
          <input id="toAyah" name="toAyah" type="number" min={1} max={ayat} placeholder={String(ayat)} className={input} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="quality" className={label}>
            How it went
          </label>
          <select id="quality" name="quality" defaultValue="" className={input}>
            <option value="">—</option>
            <option value="3">Excellent</option>
            <option value="2">Good</option>
            <option value="1">Needs work</option>
          </select>
        </div>
        <div>
          <label htmlFor="mistakes" className={label}>
            Mistakes
          </label>
          <input id="mistakes" name="mistakes" type="number" min={0} className={input} />
        </div>
        <div>
          <label htmlFor="progress-date" className={label}>
            Date
          </label>
          <input id="progress-date" name="date" type="date" defaultValue={toDateInputValue(new Date())} className={input} />
        </div>
      </div>

      <div>
        <label htmlFor="progress-note" className={label}>
          Note (optional)
        </label>
        <input id="progress-note" name="note" placeholder="Work on madd in ayah 4" className={input} />
      </div>

      <button type="submit" disabled={pending} className={primaryButton}>
        {pending ? "Saving…" : "Log progress"}
      </button>
    </fetcher.Form>
  );
}
