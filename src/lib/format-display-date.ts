/** Fixed en-US formatting so SSR (Node) and the browser render the same date string. */
export function formatDisplayDate(input: Date | string): string {
  const d = typeof input === "string" ? new Date(input) : input;
  return d.toLocaleDateString("en-US", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
  });
}
