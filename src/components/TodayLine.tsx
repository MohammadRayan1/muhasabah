"use client";

import { useSyncExternalStore } from "react";

const gregorian = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" });
const hijri = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const noop = () => () => {};

/**
 * Today's date in the viewer's own timezone, with the Hijri date beside it.
 * Rendered only on the client: the server runs in UTC and would show the wrong
 * day for an evening visit.
 */
export default function TodayLine() {
  const text = useSyncExternalStore(
    noop,
    () => {
      const now = new Date();
      return `${gregorian.format(now)} · ${hijri.format(now)}`;
    },
    () => null,
  );

  return <p className="mt-1.5 min-h-6 text-stone-500">{text}</p>;
}
