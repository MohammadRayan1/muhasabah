import type { ReactNode } from "react";
import { pageTitle } from "@/components/ui";

/** Title, one line of context, and optional actions: the same top on every teacher page. */
export default function PageHeader({
  title,
  description,
  actions,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-10 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <div className="min-w-0">
        <h1 className={pageTitle}>{title}</h1>
        {description ? <p className="mt-2 max-w-[60ch] text-[15px] leading-relaxed text-stone-500">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </header>
  );
}
