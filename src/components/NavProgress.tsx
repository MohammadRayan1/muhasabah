import { useNavigation } from "react-router";

/** Thin gold bar along the top while a page or form is loading. */
export default function NavProgress() {
  const busy = useNavigation().state !== "idle";
  return <div aria-hidden className={`nav-progress print:hidden ${busy ? "is-busy" : ""}`} />;
}
