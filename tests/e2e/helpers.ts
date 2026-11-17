import { expect, type Page } from '@playwright/test';

export interface Point {
  x: number;
  y: number;
}

declare global {
  interface Window {
    __carInspector?: {
      getPartScreenPosition(id: string): Point | null;
      partAt(x: number, y: number): string | null;
      getCameraAngles(): { azimuth: number; polar: number };
      firstFrameAt: number | null;
      drawCalls(): number;
      renderedFrames(): number;
      isMoving(): boolean;
    };
  }
}

/** Open the app, wait for the 3D view and its test hooks, and collect console errors. */
export async function openApp(page: Page): Promise<string[]> {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  return errors;
}

export async function waitFor3D(page: Page): Promise<void> {
  await expect(page.getByRole('img', { name: /Rotatable 3D vehicle/ })).toBeVisible();
  await page.waitForFunction(() => window.__carInspector?.firstFrameAt != null);
  await waitForCameraRest(page);
}

export async function waitForCameraRest(page: Page): Promise<void> {
  // Let a pending camera update render, then wait until camera-controls reports rest.
  await page.evaluate(
    () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))),
  );
  await page.waitForFunction(() => window.__carInspector && !window.__carInspector.isMoving());
}

export async function partScreenPosition(page: Page, id: string): Promise<Point> {
  const p = await page.evaluate((partId) => window.__carInspector!.getPartScreenPosition(partId), id);
  if (!p) throw new Error(`Part ${id} is not on screen`);
  return p;
}

export function liveRegion(page: Page) {
  return page.getByTestId('live-announcer');
}
