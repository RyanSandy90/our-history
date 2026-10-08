import { expect, test, type Page } from "@playwright/test";

/** Watch the real page and its assets, so a missing photo, font or model fails review. */
async function openReview(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("response", response => {
    if (new URL(response.url()).origin === new URL(page.url()).origin && response.status() >= 400) {
      errors.push(`${response.status()} ${new URL(response.url()).pathname}`);
    }
  });
  await page.goto("/");
  await expect(page.locator(".aquinas-history")).toHaveAttribute("data-opening", "ready", { timeout: 20_000 });
  await expect(page.locator(".history-hero-reveal")).toHaveCSS("transform", "none");
  await expect(page.locator(".history-focus-word").last()).toHaveCSS("opacity", "1");
  await expect.poll(() => page.locator(".history-orbit-card img").evaluateAll(images =>
    images.length > 0 && images.every(image => image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0),
  )).toBe(true);
  return errors;
}

async function waitForCard(page: Page, frame: number) {
  const cue = page.locator(".history-scroll-continue");
  await expect(cue).toHaveAttribute("data-frame", String(frame));
  await expect(cue).toHaveAttribute("aria-disabled", "false");
  await expect(cue).toHaveCSS("opacity", "1");
  const panel = page.locator(`[data-intro-frame="${frame}"]`);
  await expect(panel).toBeVisible();
  await expect(panel).toHaveCSS("opacity", "1");
  // A pinned transform can leave a fraction of a CSS pixel outside the viewport.
  await expect(panel).toBeInViewport({ ratio: .999 });
  await expect(page.locator(`[data-intro-frame="${frame}"] .history-text-word`).last()).toHaveCSS("opacity", "1");
}

test("the complete opening journey reaches the timeline, loads each model and returns to the hero", async ({ page }) => {
  test.setTimeout(90_000);
  const errors = await openReview(page);
  await page.getByRole("button", { name: "Start Your Journey", exact: true }).click();
  for (let frame = 1; frame <= 3; frame++) {
    await waitForCard(page, frame);
    await page.getByRole("button", { name: "Scroll to continue", exact: true }).click();
  }
  const timeline = page.locator("#history-timeline");
  await expect(timeline).toHaveAttribute("data-active-year", "1762");
  await expect(page.locator(".history-scroll-continue")).toHaveCount(0);
  for (const year of ["1789", "1808", "1894"]) {
    await page.getByRole("button", { name: new RegExp(`^${year}:`) }).click();
    await expect(timeline).toHaveAttribute("data-active-year", year);
    await expect(page.locator(".history-model-viewer")).toHaveAttribute("data-model-state", "ready", { timeout: 20_000 });
    await expect(page.locator(".history-model-viewer canvas")).toHaveCount(1);
  }
  await page.getByRole("link", { name: "Skip timeline", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#history-end")).toBeInViewport();
  await page.getByRole("button", { name: "Back to Start", exact: true }).click();
  await expect.poll(() => page.evaluate(() => scrollY)).toBeLessThan(2);
  await expect(page.locator(".history-hero h1")).toHaveCSS("opacity", "1");
  await expect(page.locator(".history-site-footer")).toHaveCount(1);
  expect(errors).toEqual([]);
});

test.describe("phone review", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test("the centered hero and full-screen introduction remain usable by touch", async ({ page }) => {
    const errors = await openReview(page);
    const hero = (await page.locator(".history-hero-content").boundingBox())!;
    expect(hero.x + hero.width / 2).toBeCloseTo(195, 0);
    expect(hero.y + hero.height / 2).toBeCloseTo(422, 0);
    // Intro cards share the pinned stage with the hero; visibility and inertness,
    // rather than their geometry, determine whether the next card is exposed.
    const firstCard = page.locator('[data-intro-frame="1"]');
    await expect(firstCard).toBeHidden();
    await expect(firstCard).toHaveCSS("opacity", "0");
    await expect(firstCard).toHaveAttribute("aria-hidden", "true");
    await expect(firstCard).toHaveJSProperty("inert", true);
    const start = page.getByRole("button", { name: "Start Your Journey", exact: true });
    const cue = page.getByRole("button", { name: "Swipe to continue", exact: true });
    await expect(start).toBeInViewport({ ratio: 1 });
    await expect(cue).toBeInViewport({ ratio: 1 });
    const startBox = (await start.boundingBox())!;
    const cueBox = (await cue.boundingBox())!;
    expect(startBox.height).toBeGreaterThanOrEqual(44);
    expect(startBox.width + .1).toBeGreaterThanOrEqual(cueBox.width);
    expect(startBox.height + .1).toBeGreaterThanOrEqual(cueBox.height);
    await start.tap();
    await waitForCard(page, 1);

    // Exercise an actual touch gesture as well as the accessible continue button.
    await expect(page.locator(".aquinas-history")).not.toHaveAttribute("data-scroll-locked");
    await page.waitForTimeout(260);
    const session = await page.context().newCDPSession(page);
    await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 370, y: 620 }] });
    for (let step = 1; step <= 5; step++) {
      await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: 370, y: 620 - step * 30 }] });
    }
    await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await session.detach();
    await waitForCard(page, 2);
    await cue.tap();
    await waitForCard(page, 3);
    await cue.tap();
    await expect(page.locator("#history-timeline")).toHaveAttribute("data-active-year", "1762");
    await expect(page.locator(".history-timeline-controls")).toBeInViewport({ ratio: 1 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    expect(errors).toEqual([]);
  });
});

test("reduced motion keeps the apology accessible and restores keyboard focus", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const errors = await openReview(page);
  const trigger = page.getByRole("button", { name: "View Apology", exact: true });
  await trigger.focus();
  await trigger.press("Enter");
  const modal = page.getByRole("dialog");
  await expect(modal).toHaveAttribute("data-phase", "open");
  await expect(page.locator(".history-apology-card")).toHaveCSS("transform", "none");
  await expect(modal.getByRole("heading")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(modal.getByRole("button", { name: "Return to Our History" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(modal).toHaveCount(0);
  await expect(trigger).toBeFocused();
  expect(await page.evaluate(() => scrollY)).toBe(0);
  const cue = page.getByRole("button", { name: "Scroll to continue", exact: true });
  await cue.focus();
  await cue.press("Enter");
  await waitForCard(page, 1);
  await expect(cue).toHaveAttribute("data-phase", "waiting");
  expect(errors).toEqual([]);
});
