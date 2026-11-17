import { expect, test } from '@playwright/test';
import { waitFor3D } from './helpers';

// SC-004: the interactive car within 3 s on a typical broadband connection (Chromium only:
// network throttling needs the DevTools protocol).
test('first 3D frame within 3 s on 20 Mbps / 20 ms (SC-004)', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'Network throttling needs Chromium DevTools');
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 20,
    downloadThroughput: (20 * 1024 * 1024) / 8,
    uploadThroughput: (5 * 1024 * 1024) / 8,
  });

  await page.goto('/');
  await waitFor3D(page);
  const ms = await page.evaluate(() => window.__carInspector!.firstFrameAt!);
  test.info().annotations.push({ type: 'first-frame-ms', description: String(Math.round(ms)) });
  console.log(`First 3D frame at ${Math.round(ms)} ms`);
  expect(ms).toBeLessThanOrEqual(3000);

  const calls = await page.evaluate(() => window.__carInspector!.drawCalls());
  console.log(`Draw calls in last frame: ${calls}`);
  expect(calls).toBeLessThan(10);

  // Nothing redraws while idle (frameloop="demand", Principle II).
  const before = await page.evaluate(() => window.__carInspector!.renderedFrames());
  await page.waitForTimeout(1000);
  const after = await page.evaluate(() => window.__carInspector!.renderedFrames());
  console.log(`Frames rendered during 1 s idle: ${after - before}`);
  expect(after - before).toBe(0);
});
