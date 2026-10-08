import { expect, test } from "@playwright/test";

test("3D Lab shows a real pin-mapped circuit illustration instead of abstract icons", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));

  for (const width of [390, 768, 1366]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/3d-lab");
    const hero = page.locator(".circuit-hero");
    await expect(hero).toBeVisible();
    await expect(hero.getByText("CIRCUIT WORKBENCH / STARTER BUILD")).toBeVisible();
    const img = hero.getByRole("img", { name: /Arduino Uno LED blink wiring/i });
    await expect(img).toBeVisible();
    await expect.poll(() => img.evaluate(element => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    expect(await img.getAttribute("src")).toContain("arduino-uno-led-breadboard.svg");
    await expect(hero.getByText("D8 → 330 Ω → LED (+) → GND")).toBeVisible();
    await expect(hero.getByRole("link", { name: /Build this circuit/ })).toHaveAttribute("href", "#workbench");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `overflow at ${width}px`).toBe(true);
  }
  expect(errors).toEqual([]);
});

test("starter diagram links to working circuit builder without changing guided and CAD features", async ({ page }) => {
  await page.goto("/3d-lab");
  await page.getByRole("link", { name: /Build this circuit/ }).click();
  await expect(page.getByRole("region", { name: "Free-build interactive breadboard" })).toBeVisible();
  await page.getByRole("region", { name: "Free-build interactive breadboard" })
    .getByRole("button", { name: "Load working example" }).click();
  await expect(page.getByRole("region", { name: "Free-build interactive breadboard" })
    .getByRole("button", { name: "Run blink preview" })).toBeEnabled();
  await expect(page.getByRole("link", { name: /Open guided circuit lessons/ })).toBeVisible();
  await expect(page.getByRole("tab", { name: /CAD Workspace/ })).toBeVisible();
});
