export function formatM(value) {
  if (value == null) return '—';
  if (Math.abs(value) >= 100) return `$${Math.round(value)}M`;
  return `$${(Math.round(value * 10) / 10).toFixed(1)}M`;
}

export function formatDollars(value) {
  if (value == null || value === 0) return '$0';
  const absoluteValue = Math.abs(value);
  if (absoluteValue >= 1_000_000) {
    const millions = value / 1_000_000;
    return `$${Number.isInteger(millions) ? millions : millions.toFixed(1)}M`;
  }
  if (absoluteValue >= 1_000) return `$${Math.round(value / 1_000)}k`;
  return `$${Math.round(value)}`;
}
