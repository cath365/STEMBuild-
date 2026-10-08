import { expect, test } from "@playwright/test";

test("third-party component image failures render truthful accessible placeholders", async ({ page }) => {
  await page.goto("/learning-paths/first-robot");
  const stage = page.locator(".learning-path-stage").filter({has:page.getByRole("heading",{name:"Smart Environment Monitor"})});
  const photo = stage.getByAltText("Real DHT11 digital temperature and humidity sensor");
  await photo.scrollIntoViewIfNeeded();
  // Simulate a CDN failure without depending on Wikimedia network or rate limits.
  await photo.evaluate(element => element.dispatchEvent(new Event("error")));
  await expect(stage.getByRole("status")).toContainText("Photo temporarily unavailable");
  await expect(photo).toHaveCount(0);
  await expect(stage.getByText(/The image host did not load/)).toBeVisible();
  await expect(page.getByRole("heading",{name:/From your first LED/i})).toBeVisible();
});
