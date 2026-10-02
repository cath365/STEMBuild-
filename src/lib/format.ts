export function percent(value: number, max: number) {
  if (!max) return "0%";
  return `${Math.round((value / max) * 100)}%`;
}

export function percentRatio(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${Math.round(value * 100)}%`;
}

export function formatDuration(valueMs: number | null | undefined) {
  if (valueMs == null || !Number.isFinite(valueMs)) return "—";
  const totalMinutes = Math.max(0, Math.round(valueMs / 60000));
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
}

export function formatDate(value: Date | string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(value));
}
