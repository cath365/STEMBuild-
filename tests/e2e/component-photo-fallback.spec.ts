import { expect, test } from "@playwright/test";

test("rate-limited third-party component image renders a truthful, accessible placeholder", async ({ page }) => {
  await page.route("**/Dht11_term_and_humidity_sensor.jpg", route => route.abort("failed"));
  await page.goto("/learning-paths/first-robot");
  const stage = page.locator(".learning-path-stage").filter({has:page.getByRole("heading",{name:"Smart Environment Monitor"})});
  const photo = stage.getByAltText("Real DHT11 digital temperature and humidity sensor");
  await photo.scrollIntoViewIfNeeded();
  await expect(stage.getByRole("status")).toContainText("Photo temporarily unavailable");
  await expect(photo).toHaveCount(0);
  await expect(stage.getByText(/The image host did not load/)).toBeVisible();
  await expect(page.getByRole("heading",{name:/From your first LED/i})).toBeVisible();
});
