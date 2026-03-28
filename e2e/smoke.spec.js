import { expect, test } from '@playwright/test';

test('smoke: editor updates preview after typing', async ({ page }) => {
  await page.goto('/demo/');
  await page.waitForFunction(() => Boolean(window.editor));

  const cmContent = page.locator('.cm-content');
  await cmContent.click();
  await page.keyboard.type('\n\n## E2E Smoke Heading');

  await expect(page.locator('.se-panel--preview')).toContainText('E2E Smoke Heading');
});
