export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

// Due dates are calendar days stored at midnight on the server, which runs in UTC.
// Pages now render on the server and again in the browser, so dates are formatted
// in UTC in both places; otherwise a US browser would show Dec 1 as Nov 30.
const dateFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

export function formatDate(date: Date) {
  return dateFormat.format(date);
}
