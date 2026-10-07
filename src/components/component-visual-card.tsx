import { componentVisualFor, type ComponentVisual } from "@/lib/component-visuals";

export function ComponentVisualCard({
  slug,
  compact = false,
  visual: providedVisual,
}: {
  slug: string;
  compact?: boolean;
  visual?: ComponentVisual | null;
}) {
  const visual = providedVisual ?? componentVisualFor(slug);

  if (!visual) {
    return (
      <div className={compact ? "component-visual component-visual-compact component-visual-missing" : "component-visual component-visual-missing"}>
        <div className="component-visual-placeholder" aria-hidden="true">◎</div>
        <div>
          <strong>Photo not yet verified</strong>
          {!compact ? <p>STEMBuild will not show an unverified image for this component. Use the written labels and verify the exact part in your hand.</p> : null}
        </div>
      </div>
    );
  }

  return (
    <figure className={compact ? "component-visual component-visual-compact" : "component-visual"}>
      <div className="component-visual-image">
        <img src={visual.src} alt={visual.alt} loading="lazy" />
        <span className="component-photo-badge">✓ Verified real photo</span>
      </div>
      {!compact ? (
        <figcaption>
          <p>{visual.caption}</p>
          {(visual.credit || visual.license) ? <div className="component-photo-credit">
            {visual.sourceUrl ? <>Photo: <a href={visual.sourceUrl} target="_blank" rel="noreferrer">{visual.credit || "source"}</a></> : visual.credit ? <>Photo: {visual.credit}</> : null}
            {visual.credit && visual.license ? " · " : null}
            {visual.licenseUrl ? <a href={visual.licenseUrl} target="_blank" rel="noreferrer">{visual.license}</a> : visual.license ? visual.license : null}
          </div> : null}
        </figcaption>
      ) : null}
    </figure>
  );
}
