import { expect, test } from '@playwright/test';
import { openApp, waitFor3D } from './helpers';

test('recovers from a lost GPU context without losing the inspection (T064)', async ({ page }) => {
  await openApp(page);
  await waitFor3D(page);
  const parts = page.getByRole('list', { name: 'All parts' });
  await parts.getByRole('button', { name: /^Bonnet/ }).click();
  await page.getByRole('group', { name: 'Condition' }).getByRole('button', { name: 'Damage' }).click();
  await expect(page.getByTestId('progress')).toContainText('1/26');

  await page.evaluate(async () => {
    const canvas = document.querySelector('canvas')!;
    const gl = (canvas.getContext('webgl2') ?? canvas.getContext('webgl'))!;
    const ext = gl.getExtension('WEBGL_lose_context')!;
    ext.loseContext();
    await new Promise((r) => setTimeout(r, 300));
    ext.restoreContext();
  });

  // A fresh canvas renders again and the recorded work is intact.
  await expect(page.getByText('Restoring 3D view…')).toHaveCount(0);
  await expect(page.getByRole('img', { name: /Rotatable 3D vehicle/ })).toBeVisible();
  await page.waitForFunction(() => window.__carInspector?.firstFrameAt != null);
  await expect(page.getByTestId('progress')).toContainText('1/26');
  await expect(parts.getByRole('button', { name: /^Bonnet/ })).toContainText('Damage');
});
