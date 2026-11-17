import { expect, test } from '@playwright/test';
import { openApp } from './helpers';

test('progress counts and "Pass the rest" (US3)', async ({ page }) => {
  await openApp(page);
  const parts = page.getByRole('list', { name: 'All parts' });
  const condition = page.getByRole('group', { name: 'Condition' });
  const progress = page.getByTestId('progress');

  await parts.getByRole('button', { name: /^Bonnet/ }).click();
  await condition.getByRole('button', { name: 'Damage' }).click();
  await parts.getByRole('button', { name: /^Roof/ }).click();
  await condition.getByRole('button', { name: 'Advisory' }).click();
  await expect(progress).toContainText('2/26');
  await expect(progress).toContainText('0 pass · 1 advisory · 1 damage');

  await page.getByRole('button', { name: 'Pass the rest' }).click();
  await expect(progress).toContainText('26/26');
  await expect(progress).toContainText('24 pass · 1 advisory · 1 damage');
  await expect(page.getByRole('button', { name: 'Pass the rest' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Save' })).toHaveCount(0);
});

test('nothing is saved: a reload starts a fresh inspection', async ({ page }) => {
  await openApp(page);
  await page.getByRole('list', { name: 'All parts' }).getByRole('button', { name: /^Bonnet/ }).click();
  await page.getByRole('group', { name: 'Condition' }).getByRole('button', { name: 'Damage' }).click();
  await expect(page.getByTestId('progress')).toContainText('1/26');
  await page.reload();
  await expect(page.getByTestId('progress')).toContainText('0/26');
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
});
