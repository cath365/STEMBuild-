import { componentVisualFor } from "@/lib/component-visuals";

export function ComponentVisualCard({
  slug,
  compact = false,
}: {
  slug: string;
  compact?: boolean;
}) {
  const visual = componentVisualFor(slug);

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
          <div className="component-photo-credit">
            Photo: <a href={visual.sourceUrl} target="_blank" rel="noreferrer">{visual.credit}</a>
            {" · "}
            <a href={visual.licenseUrl} target="_blank" rel="noreferrer">{visual.license}</a>
          </div>
        </figcaption>
      ) : null}
    </figure>
  );
}
