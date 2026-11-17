import { expect, test } from '@playwright/test';
import { openApp, waitFor3D } from './helpers';

test('switching vehicle type confirms first and rebuilds the parts (US5)', async ({ page }) => {
  const errors = await openApp(page);
  await waitFor3D(page);
  const types = page.getByRole('group', { name: 'Vehicle type' });
  const parts = page.getByRole('list', { name: 'All parts' });

  await parts.getByRole('button', { name: /^Bonnet/ }).click();
  await page.getByRole('group', { name: 'Condition' }).getByRole('button', { name: 'Damage' }).click();

  await types.getByRole('button', { name: 'Saloon' }).click();
  const dialog = page.getByRole('dialog', { name: 'Start a new inspection?' });
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(types.getByRole('button', { name: 'SUV' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('progress')).toContainText('1/26');

  await types.getByRole('button', { name: 'Saloon' }).click();
  await dialog.getByRole('button', { name: 'Switch and clear' }).click();
  await expect(types.getByRole('button', { name: 'Saloon' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('progress')).toContainText('0/24');
  await expect(parts.getByRole('button', { name: /^Boot lid$/ })).toBeVisible();
  await expect(parts.getByRole('button', { name: /quarter window/ })).toHaveCount(0);
  expect(errors).toEqual([]);
});
