import { expect, test, type Locator, type Page } from '@playwright/test';
import { openApp } from './helpers';

/** Press Tab until `target` has focus, checking every stop shows a focus outline (FR-021). */
async function tabTo(page: Page, target: Locator, max = 60) {
  for (let i = 0; i < max; i++) {
    await page.keyboard.press('Tab');
    const outline = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      return el && el !== document.body ? getComputedStyle(el).outlineStyle : 'n/a';
    });
    expect(outline, 'focused element must show an outline').not.toBe('none');
    if (await target.evaluate((el) => el === document.activeElement)) return;
  }
  throw new Error('Could not reach the target with Tab');
}

test('an inspection can be completed with the keyboard only (SC-006)', async ({ page }) => {
  await openApp(page);
  const nav = page.getByRole('navigation', { name: 'Inspection areas' });

  await tabTo(page, nav.getByRole('button', { name: /^Front/ }));
  await page.keyboard.press('Enter');
  const front = page.getByRole('list', { name: 'Front parts' });
  await expect(front).toBeVisible();

  // The list is one tab stop; arrows move within it.
  await tabTo(page, front.getByRole('button').first());
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(front.getByRole('button', { name: /^Bonnet/ })).toHaveAttribute('aria-pressed', 'true');

  await tabTo(page, page.getByRole('group', { name: 'Condition' }).getByRole('button', { name: 'Damage' }));
  await page.keyboard.press('Space');
  await tabTo(page, page.getByRole('textbox', { name: 'Notes' }));
  await page.keyboard.type('Stone chip');
  await expect(front.getByRole('button', { name: /^Bonnet/ })).toContainText('Damage');

  // Switch vehicle through the confirmation dialog.
  await tabTo(page, page.getByRole('group', { name: 'Vehicle type' }).getByRole('button', { name: 'Van' }));
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: 'Start a new inspection?' });
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('group', { name: 'Vehicle type' }).getByRole('button', { name: 'Van' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(dialog.getByRole('button', { name: 'Switch and clear' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('progress')).toContainText('0/26');

  await tabTo(page, page.getByRole('button', { name: 'Pass the rest' }));
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('progress')).toContainText('26/26');
});
