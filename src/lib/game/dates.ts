// ---------------------------------------------------------------------------
// DAYZERO – Deterministic Date Formatting Helper
// ---------------------------------------------------------------------------
// Formats timestamps consistently using UTC date parts to ensure identical
// output across server (SSR/Node) and client runtimes, avoiding hydration mismatches.
// ---------------------------------------------------------------------------

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

export function formatDeterministicDate(
  dateString: string | null | undefined,
  includeYear = true
): string {
  if (!dateString) return '';
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return dateString;

  const month = MONTHS[d.getUTCMonth()];
  const day = d.getUTCDate();
  const year = d.getUTCFullYear();

  return includeYear ? `${month} ${day}, ${year}` : `${month} ${day}`;
}
