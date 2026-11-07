import { SerialCaptureSummary } from "@/components/hardware-monitor";
import { captureToPoints, readStoredCapture, summarize } from "@/lib/serial-capture";

/** Server-rendered view of readings a learner attached from their board. Renders nothing when absent. */
export function StoredSerialCapture({ value, open = false }: { value: unknown; open?: boolean }) {
  const capture = readStoredCapture(value);
  if (!capture) return null;
  const points = captureToPoints(capture);
  return <details className="hw-evidence" open={open}>
    <summary>Live hardware readings · {capture.series.join(", ")} · {(capture.durationMs / 1000).toFixed(1)} s</summary>
    <div className="inline small muted" style={{ marginTop: 8 }}>
      <span className="badge">Recorded {new Date(capture.startedAt).toLocaleString("en", { dateStyle: "medium", timeStyle: "short" })}</span>
      <span className="badge">{capture.totalLines} serial lines</span>
      <span className="badge">{capture.baudRate} baud</span>
    </div>
    <p className="small muted" style={{ marginBottom: 0 }}>Captured in the browser from a USB serial device during this attempt. It shows what the connected board printed; check it against the photo evidence and code.</p>
    <SerialCaptureSummary capture={capture} summary={summarize(points, capture.series)} points={points} />
  </details>;
}
