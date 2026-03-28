import { expect, test } from '@playwright/test';

test('busy overlay is shown during runWithBusy task and hidden after completion', async ({ page }) => {
  await page.goto('/demo/');
  await page.waitForFunction(() => Boolean(window.editor));

  await page.evaluate(() => {
    window.editor.runWithBusy(
      () => new Promise((resolve) => setTimeout(resolve, 450)),
      {
        label: 'E2E Busy Task',
        detail: 'Running integration check',
        lock: true,
      },
    );
  });

  await expect.poll(async () => page.locator('.se-loading-overlay').getAttribute('aria-hidden')).toBe('false');
  await expect(page.locator('.se-loading-overlay__label')).toContainText('E2E Busy Task');
  await expect.poll(async () => page.locator('.se-loading-overlay').getAttribute('aria-hidden'), {
    timeout: 3000,
  }).toBe('true');
});
