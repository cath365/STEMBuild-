import { expect, test } from "@playwright/test";

test("rate-limited third-party component image renders a truthful, accessible placeholder", async ({ page }) => {
  await page.route("**/Dht11_term_and_humidity_sensor.jpg", route => route.abort("failed"));
  await page.goto("/learning-paths/first-robot");
  const photo = page.getByAltText("Real DHT11 digital temperature and humidity sensor").first();
  await photo.scrollIntoViewIfNeeded();
  const container = photo.locator("xpath=../..");
  await expect(container.getByRole("status")).toContainText("Photo temporarily unavailable");
  await expect(photo).toHaveCount(0);
  await expect(container.getByText("The image host did not load.")).toBeVisible();
  await expect(page.getByRole("heading", {name:/First Robot/i})).toBeVisible();
});
