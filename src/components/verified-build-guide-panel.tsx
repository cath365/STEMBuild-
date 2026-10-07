import { ComponentVisualCard } from "@/components/component-visual-card";
import type { VerifiedBuildGuide } from "@/lib/verified-build-guides";

export function VerifiedBuildGuidePanel({ guide }: { guide: VerifiedBuildGuide }) {
  return <div className="verified-guide stack">
    <div className="verified-guide-status">
      <span className="badge badge-green">SOURCE-REVIEWED GUIDE</span>
      <p className="small muted">{guide.statusNote}</p>
    </div>

    <div className="verified-guide-board">
      <ComponentVisualCard slug={guide.boardSlug} compact />
      <div>
        <div className="eyebrow">BOARD-SPECIFIC WIRING</div>
        <h3>{guide.title}</h3>
        <p className="small muted">Follow the labels on your actual board/module. If the physical part does not match this guide, stop and verify the revision before power.</p>
      </div>
    </div>

    <div>
      <h3>Connection map</h3>
      <div className="wiring-map" role="list">
        {guide.connections.map((connection, index) => <div className="wiring-map-row" role="listitem" key={index}>
          <div className="wiring-node from"><span>FROM</span><strong>{connection.from}</strong></div>
          <div className="wiring-arrow" aria-hidden="true">→</div>
          <div className="wiring-node to"><span>TO</span><strong>{connection.to}</strong></div>
          <div className="wiring-purpose">{connection.purpose}{connection.caution ? <div className="wiring-caution">⚠ {connection.caution}</div> : null}</div>
        </div>)}
      </div>
    </div>

    <div className="card card-muted">
      <div className="eyebrow">BEFORE POWER</div>
      <ul className="list">{guide.prePowerChecks.map((item) => <li key={item}>{item}</li>)}</ul>
    </div>

    <div>
      <div className="inline"><h3 style={{marginRight:"auto"}}>Reviewed example code</h3><span className="badge">{guide.codeLanguage}</span></div>
      <pre className="verified-code"><code>{guide.code}</code></pre>
      <p className="small muted">This code has been reviewed against the wiring above. It is not a substitute for checking your exact hardware revision, motor polarity or external power arrangement.</p>
    </div>

    <div className="verified-guide-outcomes">
      <div className="card card-muted"><div className="eyebrow">WHAT YOU SHOULD SEE</div><ul className="list">{guide.expected.map((item)=><li key={item}>{item}</li>)}</ul></div>
      <div className="card card-muted"><div className="eyebrow">COMMON MISTAKES</div><ul className="list">{guide.commonMistakes.map((item)=><li key={item}>{item}</li>)}</ul></div>
    </div>

    <div className="small muted"><strong>Technical notes:</strong> {guide.sourceNotes.join(" ")}</div>
  </div>;
}
