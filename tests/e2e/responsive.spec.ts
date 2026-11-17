import { expect, test } from '@playwright/test';
import { openApp, waitFor3D } from './helpers';

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

test('phone layout follows the mobile design (FR-024)', async ({ page }) => {
  await openApp(page);
  await waitFor3D(page);

  // No sideways scroll.
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);

  // Order: header, body style, car (with camera presets over it), zones, parts sheet.
  await expect(page.getByRole('heading', { name: 'Inspection', level: 1 })).toBeVisible();
  const box = async (name: Parameters<typeof page.getByRole>[0], opts: Parameters<typeof page.getByRole>[1]) =>
    (await page.getByRole(name, opts).boundingBox())!;
  const types = await box('group', { name: 'Vehicle type' });
  const car = await box('region', { name: '3D vehicle' });
  const presets = await box('group', { name: 'Camera view' });
  const zones = await box('navigation', { name: 'Inspection areas' });
  const sheet = await box('region', { name: 'Parts' });
  expect(car.y).toBeGreaterThanOrEqual(types.y + types.height);
  expect(presets.y).toBeGreaterThan(car.y);
  expect(presets.y + presets.height).toBeLessThanOrEqual(car.y + car.height + 1);
  expect(zones.y).toBeGreaterThanOrEqual(car.y + car.height);
  expect(sheet.y).toBeGreaterThanOrEqual(zones.y + zones.height);

  // Selecting a part shows its condition controls at the top of the sheet.
  await page.getByRole('list', { name: 'All parts' }).getByRole('button', { name: /^Bonnet/ }).tap();
  await expect(page.getByRole('heading', { name: 'Bonnet', level: 2 })).toBeVisible();
  await page.getByRole('group', { name: 'Condition' }).getByRole('button', { name: 'Advisory' }).tap();
  await expect(page.getByTestId('progress')).toContainText('1/26');

  // Touch targets stay at least 44 px (FR-024), including the design's tighter controls.
  const small = await page.getByRole('button').evaluateAll((buttons) =>
    buttons
      .map((b) => ({ name: b.textContent?.trim() || b.getAttribute('aria-label'), r: b.getBoundingClientRect() }))
      .filter(({ r }) => r.width > 0 && (r.height < 44 || r.width < 44))
      .map(({ name, r }) => `${name} ${Math.round(r.width)}×${Math.round(r.height)}`),
  );
  expect(small).toEqual([]);
});

test.describe('short phone screens', () => {
  test.use({ viewport: { width: 390, height: 600 }, hasTouch: true });

  test('the page scrolls to the last part, with the footer always on screen', async ({ page }) => {
    await openApp(page);
    await waitFor3D(page);
    const footer = page.getByTestId('progress');
    const save = footer.getByRole('button', { name: 'Pass the rest' });
    await expect(save).toBeInViewport();

    const last = page.getByRole('list', { name: 'All parts' }).getByRole('button').last();
    await last.scrollIntoViewIfNeeded();
    await expect(last).toBeInViewport();
    await expect(save).toBeInViewport();
    // The last row isn't hidden behind the pinned footer.
    const row = (await last.boundingBox())!;
    const bar = (await footer.boundingBox())!;
    expect(row.y + row.height).toBeLessThanOrEqual(bar.y + 1);
  });
});
