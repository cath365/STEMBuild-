import test from "node:test";
import assert from "node:assert/strict";
import { buildProjects, componentCatalog } from "../../src/lib/build-catalog";
import { verifiedBuildGuides, guideFor } from "../../src/lib/verified-build-guides";
import { componentPinouts } from "../../src/lib/component-pinouts";

test("reviewed build guides reference real projects and supported boards", () => {
  const projects = new Map(buildProjects.map((project) => [project.slug, project]));
  const components = new Set(componentCatalog.map((item) => item.slug));
  const keys = new Set<string>();

  for (const guide of verifiedBuildGuides) {
    const project = projects.get(guide.projectSlug);
    assert.ok(project, `unknown project ${guide.projectSlug}`);
    assert.ok(project.boards.includes(guide.board), `${guide.projectSlug} does not list ${guide.board}`);
    assert.ok(components.has(guide.boardSlug), `unknown board component ${guide.boardSlug}`);
    assert.ok(guide.connections.length > 0);
    assert.ok(guide.prePowerChecks.length > 0);
    assert.ok(guide.code.includes("void setup"));
    assert.ok(guide.code.includes("void loop"));
    assert.ok(guide.expected.length > 0);
    assert.ok(guide.commonMistakes.length > 0);

    const key = `${guide.projectSlug}::${guide.board}`;
    assert.ok(!keys.has(key), `duplicate guide ${key}`);
    keys.add(key);
  }
});

test("first robot path has reviewed Arduino Uno guides end to end", () => {
  const required = [
    "first-led",
    "button-light",
    "light-detector",
    "smart-environment-monitor",
    "ultrasonic-distance-lab",
    "servo-sweep-lab",
    "motor-driver-test",
    "bluetooth-car",
    "obstacle-robot",
  ];
  for (const slug of required) {
    assert.ok(guideFor(slug, "Arduino Uno"), `missing Arduino Uno guide for ${slug}`);
  }
});

test("core physical components have pin-role guides", () => {
  const slugs = new Set(componentPinouts.map((item) => item.slug));
  for (const slug of ["led","push-button","ldr","dht11-dht22","hc-sr04","servo","l298n","hc05","dc-motor"]) {
    assert.ok(slugs.has(slug), `missing pin-role guide for ${slug}`);
  }
});

test("new bridge labs exist and reference real components", () => {
  const components = new Set(componentCatalog.map((item) => item.slug));
  for (const slug of ["ultrasonic-distance-lab","servo-sweep-lab","motor-driver-test"]) {
    const project = buildProjects.find((item) => item.slug === slug);
    assert.ok(project, `missing bridge lab ${slug}`);
    for (const component of project.required) assert.ok(components.has(component), `${slug} references missing component ${component}`);
  }
});
