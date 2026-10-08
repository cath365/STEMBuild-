import { test, expect } from "@playwright/test";

test("Free Build and guided lessons have separate pages on phone and desktop", async ({page}) => {
  await page.setViewportSize({width:390,height:844});
  const errors:string[] = [];
  page.on("pageerror",error=>errors.push(error.message));
  await page.goto("/3d-lab");
  await expect(page.getByRole("region",{name:"Free-build interactive breadboard"})).toBeVisible();
  await expect(page.getByText("CHOOSE A 3D PROJECT")).toHaveCount(0);
  await expect(page.getByRole("button",{name:"Auto assemble demo"})).toHaveCount(0);
  await expect(page.getByRole("link",{name:/Open guided circuit lessons/})).toBeVisible();

  await page.getByRole("link",{name:/Open guided circuit lessons/}).click();
  await expect(page).toHaveURL(/\/3d-lab\/guided$/);
  await expect(page.getByRole("button",{name:"LED Blink",exact:true})).toBeVisible();
  await expect(page.getByRole("button",{name:"Push-Button Light",exact:true})).toBeVisible();
  await expect(page.getByRole("button",{name:"Auto assemble demo"})).toBeVisible();
  await expect(page.getByRole("region",{name:"Free-build interactive breadboard"})).toHaveCount(0);
  await expect(page.getByRole("link",{name:/Free Build & other workspaces/})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test("guided circuit save and free breadboard save remain separate across navigation", async ({page}) => {
  await page.goto("/3d-lab");
  const free=page.getByRole("region",{name:"Free-build interactive breadboard"});
  await free.getByRole("button",{name:"Load working example"}).click();
  await expect(free.locator(".bb-wire-list li")).toHaveCount(3);

  await page.getByRole("link",{name:/Open guided circuit lessons/}).click();
  const sketch=page.getByRole("textbox",{name:"Arduino sketch editor"});
  await expect(sketch).toBeVisible();
  await sketch.fill((await sketch.inputValue())+"\n// keep my guided work");
  await page.getByRole("button",{name:"Save project",exact:true}).click();

  await page.getByRole("link",{name:/Free Build & other workspaces/}).click();
  await expect(free.locator(".bb-wire-list li")).toHaveCount(3);
  await page.getByRole("link",{name:/Open guided circuit lessons/}).click();
  await expect(sketch).toHaveValue(/keep my guided work/);
  await expect(page.getByRole("region",{name:"Free-build interactive breadboard"})).toHaveCount(0);
});
