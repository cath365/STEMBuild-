import test from "node:test";
import assert from "node:assert/strict";
import { buildProjects, componentCatalog } from "../../src/lib/build-catalog";

test("component slugs are unique", () => {
  const slugs = componentCatalog.map((item) => item.slug);
  assert.equal(new Set(slugs).size, slugs.length);
});

test("project slugs are unique", () => {
  const slugs = buildProjects.map((item) => item.slug);
  assert.equal(new Set(slugs).size, slugs.length);
});

test("every project references real components and a supported board", () => {
  const slugs = new Set(componentCatalog.map((item) => item.slug));
  for (const project of buildProjects) {
    assert.ok(project.boards.length > 0, `${project.slug} needs at least one board`);
    for (const component of [...project.required, ...(project.optional ?? [])]) {
      assert.ok(slugs.has(component), `${project.slug} references missing component ${component}`);
    }
  }
});

test("public catalog covers the main learning hardware categories", () => {
  const categories = new Set(componentCatalog.map((item) => item.category));
  for (const category of ["Microcontrollers","Prototyping","Basic electronics","Inputs","Sensors","Displays","Actuators","Drivers","Communication","Power","Mechanical"]) {
    assert.ok(categories.has(category as never), `missing category ${category}`);
  }
});
