import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { useLocation, useNavigate } from "react-router";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import Rosette from "@/components/Rosette";
import { useT } from "@/lib/useT";

export type TourStep = {
  /** Page the step lives on; the tour navigates there first. */
  path?: string;
  /** `data-tour` value of the element to spotlight. Omitted: a centered card. */
  target?: string;
  title: string;
  body: string;
  /** Optional final call to action. */
  cta?: { label: string; to: string };
};

type Rect = { top: number; left: number; width: number; height: number };

const PAD = 8;
const CARD_W = 360;

/** The visible element for a tour target (nav links exist twice: phone bar and sidebar). */
function findTarget(name: string): HTMLElement | null {
  const all = document.querySelectorAll<HTMLElement>(`[data-tour="${name}"]`);
  for (const el of all) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return el;
  }
  return null;
}

/** Inside a fixed or sticky area (sidebar, toggles)? Scrolling the page won't move it. */
function pinned(el: HTMLElement) {
  for (let node: HTMLElement | null = el; node; node = node.parentElement) {
    const pos = getComputedStyle(node).position;
    if (pos === "fixed" || pos === "sticky") return true;
  }
  return false;
}

export function hasSeenTour(key: string) {
  try {
    return localStorage.getItem(key) === "done";
  } catch {
    return true;
  }
}

function markSeen(key: string) {
  try {
    localStorage.setItem(key, "done");
  } catch {
    // storage blocked; the tour may show again next visit
  }
}

/**
 * A step-by-step walkthrough. It dims the page, cuts a soft spotlight around the
 * element being explained, and moves between pages on its own.
 */
export default function Tour({
  steps,
  storageKey,
  open,
  onClose,
}: {
  steps: TourStep[];
  storageKey: string;
  open: boolean;
  onClose: () => void;
}) {
  const t = useT();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [ready, setReady] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const [cardH, setCardH] = useState(260);
  const step = steps[index];

  const close = useCallback(() => {
    markSeen(storageKey);
    setReady(false);
    setIndex(0);
    onClose();
  }, [onClose, storageKey]);

  const go = useCallback((i: number) => {
    setReady(false);
    setIndex(i);
  }, []);

  // Go to the step's page, then wait for its element to appear and bring it into view.
  useEffect(() => {
    if (!open || !step) return;
    if (step.path && step.path !== pathname) {
      navigate(step.path);
      return;
    }
    let tries = 0;
    let frame = 0;
    let timer = 0;
    const look = () => {
      if (!step.target) {
        setRect(null);
        setReady(true);
        return;
      }
      const el = findTarget(step.target);
      if (el) {
        // Leave room under the element for the card when it fits; otherwise center it.
        const r = el.getBoundingClientRect();
        const fitsBelow = r.height + cardH + 56 < window.innerHeight;
        const fixed = pinned(el);
        if (!fixed) {
          const offset = fitsBelow ? 24 : (window.innerHeight - r.height) / 2;
          window.scrollTo({ top: Math.max(0, window.scrollY + r.top - offset), behavior: "smooth" });
        }
        timer = window.setTimeout(() => setReady(true), 250);
      } else if (tries++ < 60) {
        frame = requestAnimationFrame(look);
      } else {
        setRect(null);
        setReady(true);
      }
    };
    frame = requestAnimationFrame(look);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
    // cardH only tunes the scroll offset; re-running on every card resize would fight the scroll.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, step, pathname, navigate]);

  // Keep the spotlight on the element while the page scrolls or resizes.
  useLayoutEffect(() => {
    if (!open || !ready || !step?.target) return;
    const measure = () => {
      const el = findTarget(step.target!);
      if (!el) return setRect(null);
      const r = el.getBoundingClientRect();
      setRect({ top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 });
    };
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [open, ready, step]);

  useEffect(() => {
    // preventScroll: focusing mid-scroll would cancel the smooth scroll to the target.
    if (open && ready) cardRef.current?.focus({ preventScroll: true });
  }, [open, ready, index]);

  // Place the card by its real height, so it never runs off the screen.
  useEffect(() => {
    const el = cardRef.current;
    if (!open || !ready || !el) return;
    const ro = new ResizeObserver(([entry]) => setCardH(Math.ceil(entry.target.getBoundingClientRect().height)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [open, ready, index]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight" && index < steps.length - 1) go(index + 1);
      if (e.key === "ArrowLeft" && index > 0) go(index - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close, steps.length, index, go]);

  if (!open || !step) return null;

  const last = index === steps.length - 1;
  const spotlit = Boolean(rect && step.target);

  // Card goes below the element if there's room, else above; clamped to the screen.
  let cardStyle: CSSProperties = { left: "50%", top: "50%", transform: "translate(-50%, -50%)" };
  if (spotlit && rect && typeof window !== "undefined") {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const width = Math.min(CARD_W, vw - 32);
    const below = rect.top + rect.height + 12;
    const roomBelow = vh - below >= cardH + 16;
    const roomAbove = rect.top - 12 - cardH >= 16;
    const roomRight = rect.left + rect.width + 12 + width < vw - 16;
    let left = Math.min(Math.max(16, rect.left), vw - width - 16);
    let top = roomBelow ? below : roomAbove ? rect.top - 12 - cardH : Math.max(16, vh - cardH - 16);
    // Tall targets with no room above or below: sit beside them instead.
    if (!roomBelow && !roomAbove && roomRight) {
      left = rect.left + rect.width + 12;
      top = Math.min(Math.max(16, rect.top), vh - cardH - 16);
    }
    cardStyle = { left, top, width };
  }

  return (
    <div className="fixed inset-0 z-[70] print:hidden" aria-live="polite">
      {/* Dimmed page; the spotlight is a hole cut with a huge shadow. */}
      <div className="absolute inset-0" onClick={close} aria-hidden />
      {spotlit && rect ? (
        <div
          aria-hidden
          className="tour-spot pointer-events-none absolute rounded-2xl ring-2 ring-gold"
          style={{ ...rect, boxShadow: "0 0 0 9999px rgb(10 18 14 / 0.62)" }}
        />
      ) : (
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[rgb(10_18_14/0.62)]" />
      )}

      {ready ? (
        <div
          ref={cardRef}
          key={index}
          role="dialog"
          aria-modal="true"
          aria-labelledby="tour-title"
          tabIndex={-1}
          className="tour-card absolute rounded-2xl border border-stone-200 bg-white p-5 shadow-2xl shadow-stone-950/25 outline-none"
          // The card takes focus for keyboard users; it needs no focus ring of its own.
          style={{ width: Math.min(CARD_W, typeof window !== "undefined" ? window.innerWidth - 32 : CARD_W), outline: "none", ...cardStyle }}
        >
          <div className="flex items-start justify-between gap-3">
            <p className="flex items-center gap-2 text-xs font-medium text-stone-500 tabular-nums">
              <Rosette className="h-4 w-4 text-gold-ink" />
              {t("Step {n} of {total}", { n: index + 1, total: steps.length })}
            </p>
            <button
              type="button"
              onClick={close}
              aria-label={t("Close the tour")}
              className="-me-2 -mt-1 flex h-8 w-8 items-center justify-center rounded-full text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-900"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <h2 id="tour-title" className="mt-2 text-lg font-semibold text-stone-900">
            {t(step.title)}
          </h2>
          <p className="mt-1.5 text-[15px] leading-relaxed text-stone-600">{t(step.body)}</p>

          <div className="mt-4 flex items-center gap-1" aria-hidden>
            {steps.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${i === index ? "w-5 bg-emerald-600" : i < index ? "w-1.5 bg-emerald-600/40" : "w-1.5 bg-stone-200"}`}
              />
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            {index > 0 ? (
              <button
                type="button"
                onClick={() => go(index - 1)}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl px-2 text-sm font-semibold text-stone-500 transition-colors hover:text-stone-900"
              >
                <ArrowLeft aria-hidden className="h-4 w-4 rtl:-scale-x-100" />
                {t("Back")}
              </button>
            ) : (
              <button type="button" onClick={close} className="h-9 px-2 text-sm font-semibold text-stone-500 hover:text-stone-900">
                {t("Skip tour")}
              </button>
            )}
            {last ? (
              <button
                type="button"
                onClick={() => {
                  close();
                  if (step.cta) navigate(step.cta.to);
                }}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
              >
                {step.cta ? t(step.cta.label) : t("Finish")}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => go(index + 1)}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
              >
                {index === 0 ? t("Start the tour") : t("Next")}
                <ArrowRight aria-hidden className="h-4 w-4 rtl:-scale-x-100" />
              </button>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
