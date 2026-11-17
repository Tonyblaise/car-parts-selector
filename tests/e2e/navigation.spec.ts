import { expect, test } from '@playwright/test';
import { openApp, waitFor3D, waitForCameraRest } from './helpers';

// Mirrors src/scene/cameraMath.ts PRESET_VIEWS (azimuth = −yaw, polar = π/2 − pitch).
const PRESETS: Record<string, { azimuth: number; polar: number }> = {
  '3/4': { azimuth: 0.75, polar: Math.PI / 2 - 0.62 },
  Front: { azimuth: Math.PI / 2, polar: Math.PI / 2 - 0.22 },
  Right: { azimuth: 0, polar: Math.PI / 2 - 0.18 },
  Rear: { azimuth: -Math.PI / 2, polar: Math.PI / 2 - 0.22 },
  Left: { azimuth: -Math.PI, polar: Math.PI / 2 - 0.18 },
  Top: { azimuth: Math.PI / 2, polar: Math.PI / 2 - 1.45 },
};

const sameAngle = (a: number, b: number) => {
  const d = Math.abs((((a - b) % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI) - Math.PI);
  return d < 0.05;
};

test('camera presets move to their angles (FR-006)', async ({ page }) => {
  await openApp(page);
  await waitFor3D(page);
  const group = page.getByRole('group', { name: 'Camera view' });
  for (const [label, want] of Object.entries(PRESETS)) {
    await group.getByRole('button', { name: label, exact: true }).click();
    await waitForCameraRest(page);
    const got = await page.evaluate(() => window.__carInspector!.getCameraAngles());
    expect(sameAngle(got.azimuth, want.azimuth), `${label} azimuth ${got.azimuth}`).toBe(true);
    expect(Math.abs(got.polar - want.polar), `${label} polar`).toBeLessThan(0.05);
  }
});

test('zone filter follows a part picked on the car', async ({ page }) => {
  await openApp(page);
  await waitFor3D(page);
  const nav = page.getByRole('navigation', { name: 'Inspection areas' });
  await nav.getByRole('button', { name: /^Wheels/ }).click();
  await expect(page.getByRole('list', { name: 'Wheels parts' }).getByRole('button')).toHaveCount(4);

  await page.getByRole('group', { name: 'Camera view' }).getByRole('button', { name: 'Front', exact: true }).click();
  await waitForCameraRest(page);
  const bonnet = await page.evaluate(() => window.__carInspector!.getPartScreenPosition('bonnet'));
  await page.mouse.click(bonnet!.x, bonnet!.y);
  await expect(page.getByRole('list', { name: 'Front parts' })).toBeVisible();
  await expect(nav.getByRole('button', { name: /^Front/ })).toHaveAttribute('aria-pressed', 'true');
});
