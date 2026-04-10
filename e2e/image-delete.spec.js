import { expect, test } from '@playwright/test';

test('preview Delete removes full markdown image token', async ({ page }) => {
  await page.goto('/demo/');
  await page.waitForFunction(() => Boolean(window.editor));

  await page.evaluate(() => {
    window.editor.setMarkdown('before\\n![Alt](https://picsum.photos/200/100)\\nafter');
  });

  const image = page.locator('.se-panel--preview img.se-image').first();
  await image.evaluate((node) => node.click());
  await page.keyboard.press('Delete');

  const markdown = await page.evaluate(() => window.editor.getMarkdown());
  expect(markdown).not.toContain('![Alt](https://picsum.photos/200/100)');
  expect(markdown).toContain('before');
  expect(markdown).toContain('after');
});

test('preview Delete removes full markdown base64 image token', async ({ page }) => {
  await page.goto('/demo/');
  await page.waitForFunction(() => Boolean(window.editor));

  const src = `data:image/png;base64,${'a'.repeat(40000)}`;
  await page.evaluate((imageSrc) => {
    window.editor.setMarkdown(`before\n![Alt](${imageSrc})\nafter`);
  }, src);

  const image = page.locator('.se-panel--preview img.se-image').first();
  await image.evaluate((node) => node.click());
  await page.keyboard.press('Delete');

  const markdown = await page.evaluate(() => window.editor.getMarkdown());
  expect(markdown).toBe('before\n\nafter');
});

test('base64 image collapse is applied immediately without preview-triggered viewport refresh', async ({ page }) => {
  await page.goto('/demo/');
  await page.waitForFunction(() => Boolean(window.editor));

  const src = `data:image/png;base64,${'a'.repeat(200000)}`;
  const metrics = await page.evaluate((imageSrc) => {
    window.editor.setMarkdown(`before\n![Alt](${imageSrc})\nafter`);
    const codeView = window.editor._codePanel._view;
    const scroller = codeView.scrollDOM;

    return {
      collapseWidgetCount: codeView.dom.querySelectorAll('.cm-se-collapse-widget').length,
      scrollHeight: scroller.scrollHeight,
      clientHeight: scroller.clientHeight,
    };
  }, src);

  expect(metrics.collapseWidgetCount).toBeGreaterThan(0);
  expect(metrics.scrollHeight).toBeLessThan(metrics.clientHeight * 6);
});
