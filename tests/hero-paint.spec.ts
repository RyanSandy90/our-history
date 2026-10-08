import { test, expect } from "@playwright/test";

// Retina + headed Chrome exercises the GPU raster path seen in the recording.
test.use({ headless: false, viewport: { width: 1296, height: 837 }, deviceScaleFactor: 2 });

test("hero photographs remain fully painted after repeated zoom returns", async ({ page }, testInfo) => {
  await page.goto("/");
  await expect(page.locator(".aquinas-history")).toHaveAttribute("data-opening", "ready", { timeout: 10000 });
  await expect(page.locator(".history-hero-reveal")).toHaveCSS("transform", "none");
  await page.mouse.move(648, 400);

  // DOM bounds and opacity remain correct during this bug. Compare actual
  // painted pixels with the same photos before the first zoom instead.
  const baseline = new Map<string, number>();
  for (let pass = 0; pass < 4; pass++) {
    if (pass) {
      await page.mouse.wheel(0, 300);
      await expect(page.locator(".history-opening")).toHaveAttribute("data-active-frame", "1");
      await expect(page.locator(".aquinas-history")).not.toHaveAttribute("data-scroll-locked");
      await page.waitForTimeout(260);
      await page.mouse.wheel(0, -300);
      await expect.poll(() => page.evaluate(() => scrollY)).toBeLessThan(2);
      await expect(page.locator(".aquinas-history")).not.toHaveAttribute("data-scroll-locked");
      await page.waitForTimeout(260);
    }
    const boxes = await page.locator(".history-orbit-card").evaluateAll(cards => cards.map(card => {
      const { x, y, width, height, right, bottom } = card.getBoundingClientRect();
      return { year: card.getAttribute("data-year")!, x, y, width, height, right, bottom };
    }).filter(box => box.x > 8 && box.y > 8 && box.right < innerWidth - 8 && box.bottom < innerHeight - 80));
    const screenshot = await page.screenshot();
    const coverage = await page.evaluate(async ({ png, boxes }) => {
      const image = new Image();
      image.src = `data:image/png;base64,${png}`;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext("2d")!;
      context.drawImage(image, 0, 0);
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
      const scale = canvas.width / innerWidth;
      return boxes.map(box => {
        let painted = 0, count = 0;
        // Inset avoids subpixel edges and small orbit motion during capture.
        for (let y = Math.ceil((box.y + 8) * scale); y < (box.y + box.height - 8) * scale; y++) {
          for (let x = Math.ceil((box.x + 8) * scale); x < (box.x + box.width - 8) * scale; x++) {
            const offset = (y * canvas.width + x) * 4;
            if (pixels[offset] > pixels[offset + 1] * 1.5 && pixels[offset] > 25) painted++;
            count++;
          }
        }
        return { year: box.year, fraction: painted / count };
      });
    }, { png: screenshot.toString("base64"), boxes });
    await testInfo.attach(`return-${pass}`, { body: screenshot, contentType: "image/png" });
    await testInfo.attach(`coverage-${pass}`, { body: JSON.stringify(coverage), contentType: "application/json" });
    let compared = 0;
    for (const { year, fraction } of coverage) {
      if (pass === 0) {
        expect(fraction, `${year} starts fully painted`).toBeGreaterThan(.5);
        baseline.set(year, fraction);
      } else if (baseline.has(year)) {
        expect(fraction, `${year} retains photo coverage after return ${pass}`).toBeGreaterThan(baseline.get(year)! * .8);
        compared++;
      }
    }
    if (pass) expect(compared, "Check a representative set on every return").toBeGreaterThanOrEqual(8);
  }
});
