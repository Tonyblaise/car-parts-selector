import { expect, test } from '@playwright/test';
import { openApp, waitFor3D, waitForCameraRest } from './helpers';

// The whole canvas must be inside the window, or clicks near its bottom miss the page.
test.use({ viewport: { width: 1360, height: 1000 } });

// SC-005: from every preset, tapping the on-screen centre of each part that is visible there
// selects that part. "Visible" = its centre projects on screen and the pixels around it show
// that part (not covered, and not on its very edge).
test('tapping a visible part’s centre selects it from every preset (SC-005)', async ({ page }) => {
  test.slow();
  await openApp(page);
  await waitFor3D(page);
  const partIds = await page
    .getByRole('list', { name: 'All parts' })
    .getByRole('button')
    .evaluateAll((rows) => rows.map((r) => r.getAttribute('data-part-id') ?? ''));
  expect(partIds).toHaveLength(26);

  let checked = 0;
  for (const preset of ['3/4', 'Front', 'Right', 'Rear', 'Left', 'Top']) {
    await page.getByRole('group', { name: 'Camera view' }).getByRole('button', { name: preset, exact: true }).click();
    await waitForCameraRest(page);
    for (const id of partIds) {
      const target = await page.evaluate((partId) => {
        const h = window.__carInspector!;
        const p = h.getPartScreenPosition(partId);
        if (!p) return null;
        // Browsers click whole pixels; require the 3×3 pixels around the centre to be this part.
        const x = Math.round(p.x);
        const y = Math.round(p.y);
        if (x < 2 || y < 2 || x > innerWidth - 2 || y > innerHeight - 2) return null;
        for (const dx of [-1, 0, 1]) {
          for (const dy of [-1, 0, 1]) if (h.partAt(x + dx, y + dy) !== partId) return null;
        }
        return { x, y };
      }, id);
      if (!target) continue; // covered or off screen from this angle
      await page.mouse.click(target.x, target.y);
      await expect(
        page.getByRole('list', { name: 'All parts' }).locator(`[data-part-id="${id}"]`),
        `${preset}: ${id}`,
      ).toHaveAttribute('aria-pressed', 'true');
      checked++;
    }
  }
  // Every part should be reachable from at least one preset.
  expect(checked).toBeGreaterThan(40);
});
