/** A text arrow that points the reading direction (→ in English, ← in Arabic). */
export default function Arrow({ back = false }: { back?: boolean }) {
  return (
    <span aria-hidden>
      <span className={back ? "rtl:hidden" : "ltr:hidden"}>←</span>
      <span className={back ? "ltr:hidden" : "rtl:hidden"}>→</span>
    </span>
  );
}
