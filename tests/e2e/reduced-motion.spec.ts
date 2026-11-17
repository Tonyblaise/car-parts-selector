import { expect, test } from '@playwright/test';
import { openApp } from './helpers';

const THREE_QUARTER = { azimuth: 0.75, polar: Math.PI / 2 - 0.62 };
const angles = (page: import('@playwright/test').Page) =>
  page.evaluate(() => window.__carInspector!.getCameraAngles());

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('starts on 3/4 with no intro move and presets apply instantly', async ({ page }) => {
    await openApp(page);
    await page.waitForFunction(() => window.__carInspector?.firstFrameAt != null);
    const a = await angles(page);
    expect(Math.abs(a.azimuth - THREE_QUARTER.azimuth)).toBeLessThan(0.02);
    expect(Math.abs(a.polar - THREE_QUARTER.polar)).toBeLessThan(0.02);

    await page.getByRole('group', { name: 'Camera view' }).getByRole('button', { name: 'Top', exact: true }).click();
    const top = await angles(page);
    expect(top.polar).toBeLessThan(0.2);
  });
});

test.describe('full motion', () => {
  test.use({ reducedMotion: 'no-preference' });

  test('plays the short intro move to 3/4 (FR-008)', async ({ page }) => {
    await openApp(page);
    await page.waitForFunction(() => window.__carInspector?.firstFrameAt != null);
    const start = await angles(page);
    await page.waitForTimeout(1500);
    const later = await angles(page);
    expect(Math.abs(later.azimuth - start.azimuth)).toBeGreaterThan(0.3);
    await page.waitForFunction(() => !window.__carInspector!.isMoving(), null, { timeout: 5000 });
    const end = await angles(page);
    expect(Math.abs(end.azimuth - THREE_QUARTER.azimuth)).toBeLessThan(0.05);
  });
});
