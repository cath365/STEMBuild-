import { expect, test } from "@playwright/test";

test("home highlights the 3D Lab and it opens in low-data Circuit Builder mode", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto("/");
  const launch = page.getByRole("link", { name: "Launch 3D Lab" });
  await expect(launch).toBeVisible();
  await launch.click();

  await expect(page).toHaveURL(/3d-lab/);
  await expect(page.getByRole("tab", { name: /Circuit Builder/ })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tabpanel", { name: /Circuit Builder/ })).toBeVisible();
  await expect(page.getByRole("tabpanel", { name: /Robot Builder/ })).toBeHidden();
  await expect(page.getByRole("tabpanel", { name: /CAD Workspace/ })).toBeHidden();
  // Explicit launch prevents loading heavy 3D libraries on slow/low-data devices.
  await expect(page.getByRole("button", { name: "Launch 3D Workbench" })).toBeVisible();
  await expect(page.locator(".lab3d-renderer-mount canvas")).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test("switching workspace retains circuit assembly and preserves robotics and CAD work", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/3d-lab");
  await page.getByRole("button", { name: "Place", exact: true }).first().click();
  await expect(page.getByRole("img", { name: "Arduino Uno", exact: true })).toBeVisible();

  await page.getByRole("tab", { name: /Robot Builder/ }).click();
  await expect(page.getByRole("tabpanel", { name: /Robot Builder/ })).toBeVisible();
  await expect(page.locator("#robot-arena")).toBeVisible();
  await page.locator("#robot-arena").getByRole("button", { name: "Arduino Uno", exact: true }).click();
  await page.locator("#robot-arena").getByRole("button", { name: "Attach selected part" }).click();
  await expect(page.locator("#robot-arena")).toContainText("1/7 parts correctly mounted");

  await page.getByRole("tab", { name: /CAD Workspace/ }).click();
  const cad = page.locator("#robot-cad");
  await expect(cad).toBeVisible();
  await cad.getByLabel("X offset (cm)", { exact: true }).fill("4");

  await page.getByRole("tab", { name: /Circuit Builder/ }).click();
  await expect(page.getByRole("img", { name: "Arduino Uno", exact: true })).toBeVisible();
  await expect(page.getByRole("tabpanel", { name: /Robot Builder/ })).toBeHidden();

  await page.getByRole("tab", { name: /Robot Builder/ }).click();
  await expect(page.locator("#robot-arena")).toContainText("1/7 parts correctly mounted");

  await page.getByRole("tab", { name: /CAD Workspace/ }).click();
  await expect(cad.getByLabel("X offset (cm)", { exact: true })).toHaveValue("4");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("keyboard tabs and existing deep links select the right workspace", async ({ page }) => {
  await page.goto("/3d-lab#robot-arena");
  await expect(page.getByRole("tab", { name: /Robot Builder/ })).toHaveAttribute("aria-selected", "true");

  const robotTab = page.getByRole("tab", { name: /Robot Builder/ });
  await robotTab.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: /CAD Workspace/ })).toHaveAttribute("aria-selected", "true");
  await expect(page).toHaveURL(/#robot-cad$/);
  await page.reload();
  await expect(page.getByRole("tab", { name: /CAD Workspace/ })).toHaveAttribute("aria-selected", "true");

  await page.goto("/3d-lab#workbench");
  await expect(page.getByRole("tab", { name: /Circuit Builder/ })).toHaveAttribute("aria-selected", "true");
});
