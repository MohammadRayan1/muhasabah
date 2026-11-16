import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { useT } from "@/lib/useT";

export default function CopyLinkButton({ url }: { url: string }) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          window.prompt(t("Copy this link:"), url);
        }
      }}
      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 text-sm font-semibold text-stone-700 hover:bg-stone-50"
    >
      {copied ? <Check className="h-4 w-4 text-emerald-700" /> : <Copy className="h-4 w-4" />}
      {copied ? t("Copied") : t("Copy link")}
    </button>
  );
}
