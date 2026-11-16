import { useEffect, useRef } from "react";

/**
 * Blocks a second form submission while the first is still pending. React's
 * `disabled` prop on the submit button only takes effect after a render commit,
 * which leaves a window where rapid double-clicks (or holding Enter) can fire
 * the server action twice before the button visually disables.
 */
export function useSubmitGuard(pending: boolean) {
  const submittingRef = useRef(false);

  useEffect(() => {
    if (!pending) submittingRef.current = false;
  }, [pending]);

  return function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (submittingRef.current) {
      e.preventDefault();
      return;
    }
    submittingRef.current = true;
  };
}
