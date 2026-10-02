"use client";

import { logout } from "@/lib/auth-actions";
import { clearLearnerOfflineData, setActiveOfflineLearner } from "@/lib/offline-client";

export function SharedDeviceSignOut({ learnerId }: { learnerId?: string }) {
  return <div className="stack" style={{ gap: 8 }}>
    {learnerId ? <button className="btn" type="button" onClick={async () => {
      if (!confirm("Remove this learner's downloaded lessons and unfinished offline work from this device?")) return;
      await clearLearnerOfflineData(learnerId);
    }}>Clear my offline data</button> : null}
    <form action={logout} onSubmit={() => { setActiveOfflineLearner(null).catch(() => undefined); }}>
      <button className="btn" style={{ width: "100%" }}>Sign out</button>
    </form>
  </div>;
}
