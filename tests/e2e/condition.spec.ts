import { expect, test } from '@playwright/test';
import { liveRegion, openApp } from './helpers';

test('records a condition and note per part (US2)', async ({ page }) => {
  await openApp(page);
  const parts = page.getByRole('list', { name: 'All parts' });
  const bonnet = parts.getByRole('button', { name: /^Bonnet/ });

  await bonnet.click();
  await page.getByRole('group', { name: 'Condition' }).getByRole('button', { name: 'Damage' }).click();
  await page.getByRole('textbox', { name: 'Notes' }).fill('Stone chip, centre');

  await expect(bonnet).toContainText('Damage');
  await expect(liveRegion(page)).toContainText('Bonnet selected · Damage');

  await parts.getByRole('button', { name: /^Roof/ }).click();
  await expect(page.getByRole('textbox', { name: 'Notes' })).toHaveValue('');
  await bonnet.click();
  await expect(page.getByRole('textbox', { name: 'Notes' })).toHaveValue('Stone chip, centre');

  // Choosing the active condition again clears it (FR-009).
  await page.getByRole('group', { name: 'Condition' }).getByRole('button', { name: 'Damage' }).click();
  await expect(bonnet).not.toContainText('Damage');
});
