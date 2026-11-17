import { expect, test } from '@playwright/test';
import { openApp } from './helpers';

test('without WebGL the whole inspection works from the list (FR-023, SC-006)', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    // @ts-expect-error -- deliberately narrowing the overloads for the stub
    HTMLCanvasElement.prototype.getContext = function (type: string, ...rest: unknown[]) {
      if (/webgl/i.test(type)) return null;
      return original.call(this, type, ...rest);
    };
  });
  const errors = await openApp(page);

  await expect(page.getByText('3D view is not available here. Use the list.')).toBeVisible();
  await expect(page.getByRole('img', { name: /Rotatable 3D vehicle/ })).toHaveCount(0);

  await page.getByRole('navigation', { name: 'Inspection areas' }).getByRole('button', { name: /^Wheels/ }).click();
  const wheels = page.getByRole('list', { name: 'Wheels parts' });
  await wheels.getByRole('button', { name: /^Front left wheel/ }).click();
  await page.getByRole('group', { name: 'Condition' }).getByRole('button', { name: 'Advisory' }).click();
  await page.getByRole('textbox', { name: 'Notes' }).fill('Kerbed rim');
  await page.getByRole('button', { name: 'Pass the rest' }).click();

  const progress = page.getByTestId('progress');
  await expect(progress).toContainText('26/26');
  await expect(progress).toContainText('25 pass · 1 advisory · 0 damage');
  expect(errors).toEqual([]);
});
