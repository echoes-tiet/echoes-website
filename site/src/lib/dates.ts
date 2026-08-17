const MONTHS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
];

/** Best-effort parse of labels like "Released On 28th Of January 2026". Returns a sortable timestamp, or 0 if unparseable. */
export function parseDateLabel(label?: string): number {
  if (!label) return 0;
  const match = label.match(/(\d{1,2})\w*\s+of\s+([a-z]+)\s+(\d{4})/i);
  if (!match) return 0;
  const [, day, monthName, year] = match;
  const month = MONTHS.indexOf(monthName.toLowerCase());
  if (month === -1) return 0;
  return new Date(Number(year), month, Number(day)).getTime();
}
