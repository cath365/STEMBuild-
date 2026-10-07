export function StatCard({ label, value, detail }: { label: string; value: string | number; detail?: string }) {
  return <div className="card card-muted"><div className="muted small">{label}</div><div className="metric">{value}</div>{detail ? <div className="muted small">{detail}</div> : null}</div>;
}
