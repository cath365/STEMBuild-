"use client";

export default function DashboardError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <div className="card" role="alert"><h2>This action could not be completed</h2><p>Check your connection and the required fields, then try again. If the problem continues, ask your administrator to check the service configuration.</p><button className="btn btn-primary" onClick={reset}>Try again</button></div>;
}
