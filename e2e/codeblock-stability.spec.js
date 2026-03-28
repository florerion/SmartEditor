import { expect, test } from '@playwright/test';

test('code fence language switch keeps preview stable', async ({ page }) => {
  await page.goto('/demo/');
  await page.waitForFunction(() => Boolean(window.editor));

  const before = await page.evaluate(() => {
    const root = window.editor._previewPanel.getRoot();
    root.scrollTop = 700;
    return root.scrollTop;
  });

  await page.evaluate(() => {
    const select = document.querySelector('.se-code-block__lang-select');
    select.value = 'python';
    select.dispatchEvent(new Event('change', { bubbles: true }));
  });

  await page.waitForFunction(
    () => {
      if (!window.editor) return false;
      return window.editor._pinPreviewScrollTop === null;
    },
    { timeout: 3000 },
  );

  const after = await page.evaluate(() => window.editor._previewPanel.getRoot().scrollTop);
  const markdown = await page.evaluate(() => window.editor.getMarkdown());

  expect(Math.abs(after - before)).toBeLessThan(140);
  expect(markdown).toContain('```python');
});

test('typing in the middle keeps preview from jumping (stability lock)', async ({ page }) => {
  await page.goto('/demo/');
  await page.waitForFunction(() => Boolean(window.editor));

  const before = await page.evaluate(() => {
    const root = window.editor._previewPanel.getRoot();
    root.scrollTop = 900;
    window.editor._scrollSyncEnabled = false;

    const markdown = window.editor.getMarkdown();
    const middleOffset = Math.floor(markdown.length / 2);
    window.editor.setSelection(middleOffset, middleOffset);
    window.editor.replaceSelection(' [MID-EDIT] ');
    return root.scrollTop;
  });

  await page.waitForFunction(
    () => {
      if (!window.editor) return false;
      return window.editor._pinPreviewScrollTop === null;
    },
    { timeout: 3000 },
  );

  const after = await page.evaluate(() => window.editor._previewPanel.getRoot().scrollTop);
  const markdown = await page.evaluate(() => window.editor.getMarkdown());

  expect(markdown).toContain('[MID-EDIT]');
  expect(Math.abs(after - before)).toBeLessThan(180);
});
