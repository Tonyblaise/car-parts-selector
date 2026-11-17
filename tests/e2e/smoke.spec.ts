import { expect, test } from '@playwright/test';
import { liveRegion, openApp, partScreenPosition, waitFor3D, waitForCameraRest } from './helpers';

test('loads with the 3D view and no console errors', async ({ page }) => {
  const errors = await openApp(page);
  await waitFor3D(page);
  await expect(page.getByRole('navigation', { name: 'Inspection areas' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('clicking a part on the car selects it; dragging does not', async ({ page }) => {
  await openApp(page);
  await waitFor3D(page);
  const parts = page.getByRole('list', { name: 'All parts' });

  // Turn the camera to the left side by picking the door from the list (FR-007)...
  await parts.getByRole('button', { name: /^Front left door/ }).click();
  await waitForCameraRest(page);
  // ...then move the selection to another left-side part (same camera view), so the canvas
  // click is what selects the door.
  await parts.getByRole('button', { name: /^Front left wing/ }).click();
  await waitForCameraRest(page);

  const door = await partScreenPosition(page, 'front-door-left');
  await page.mouse.click(door.x, door.y);
  await expect(liveRegion(page)).toContainText('Front left door selected');
  await expect(parts.getByRole('button', { name: /^Front left door/ })).toHaveAttribute('aria-pressed', 'true');

  // A 40 px drag that starts on a part rotates the car and keeps the selection.
  const wing = await partScreenPosition(page, 'wing-left');
  await page.mouse.move(wing.x, wing.y);
  await page.mouse.down();
  await page.mouse.move(wing.x + 20, wing.y, { steps: 4 });
  await page.mouse.move(wing.x + 40, wing.y, { steps: 4 });
  await page.mouse.up();
  await expect(parts.getByRole('button', { name: /^Front left door/ })).toHaveAttribute('aria-pressed', 'true');
});

test('shows the demo registration and no workshop name (FR-020)', async ({ page }) => {
  await openApp(page);
  const nav = page.getByRole('navigation', { name: 'Inspection areas' });
  await expect(nav).not.toContainText('Riverside Motor Works');
  await expect(nav.getByLabel('Registration AB12 CDE')).toBeVisible();
});
