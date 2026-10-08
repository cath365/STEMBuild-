"use client";

import { useState } from "react";
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
  const [failedPhoto, setFailedPhoto] = useState<string | null>(null);
  const visual = providedVisual ?? componentVisualFor(slug);
  const photoUnavailable = Boolean(visual && failedPhoto === visual.src);

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
        {photoUnavailable ? (
          <div className="component-visual-photo-unavailable" role="status">
            <span className="component-visual-placeholder" aria-hidden="true">◎</span>
            <strong>Photo temporarily unavailable</strong>
            <small>The image host did not load. Check the component name and pin labels before building.</small>
          </div>
        ) : (
          <>
            {/* External photo hosts may rate-limit requests; never leave a broken image icon or pretend a different part is pictured. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={visual.src} alt={visual.alt} loading="lazy" onError={() => setFailedPhoto(visual.src)} />
            <span className="component-photo-badge">✓ Verified real photo</span>
          </>
        )}
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
