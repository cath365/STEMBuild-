import test from "node:test";
import assert from "node:assert/strict";
import { componentCatalog } from "../../src/lib/build-catalog";
import { componentVisuals } from "../../src/lib/component-visuals";

test("verified component visuals reference real catalog slugs", () => {
  const slugs = new Set(componentCatalog.map((item) => item.slug));
  for (const visual of componentVisuals) {
    assert.ok(slugs.has(visual.slug), `visual references unknown component ${visual.slug}`);
    assert.equal(visual.verified, true);
    assert.ok(visual.alt.length >= 3);
    assert.ok(visual.caption.length >= 3);
  }
});

test("component visuals have unique slug coverage", () => {
  const slugs = componentVisuals.map((visual) => visual.slug);
  assert.equal(new Set(slugs).size, slugs.length);
});

test("first visual-learning release covers at least fifteen real components", () => {
  assert.ok(componentVisuals.length >= 15);
});
