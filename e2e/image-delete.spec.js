import { expect, test } from '@playwright/test';

test('preview Delete removes full markdown image token', async ({ page }) => {
  await page.goto('/demo/');
  await page.waitForFunction(() => Boolean(window.editor));

  await page.evaluate(() => {
    window.editor.setMarkdown('before\\n![Alt](https://picsum.photos/200/100)\\nafter');
  });

  const image = page.locator('.se-panel--preview img.se-image').first();
  await image.click();
  await page.keyboard.press('Delete');

  const markdown = await page.evaluate(() => window.editor.getMarkdown());
  expect(markdown).not.toContain('![Alt](https://picsum.photos/200/100)');
  expect(markdown).toContain('before');
  expect(markdown).toContain('after');
});
