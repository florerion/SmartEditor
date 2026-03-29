import { expect, test } from '@playwright/test';

async function setupDeterministicHints(page) {
  await page.evaluate(() => {
    window.editor.replaceHints([
      { id: 'hint-bold', text: 'HINT BOLD', contexts: ['action:bold'], priority: 100 },
      { id: 'hint-italic', text: 'HINT ITALIC', contexts: ['action:italic'], priority: 100 },
      { id: 'hint-link', text: 'HINT LINK', contexts: ['action:link'], priority: 100 },
    ]);

    window.editor.updateHintConfig({
      matchSelection: 'first',
      noMatchFallback: 'none',
      autoHideMs: 160,
    });
  });
}

test('toolbar click replaces current hint immediately', async ({ page }) => {
  await page.goto('/demo/');
  await page.waitForFunction(() => Boolean(window.editor));
  await setupDeterministicHints(page);

  const boldBtn = page.locator('[data-toolbar-item-id="bold"]').first();
  const italicBtn = page.locator('[data-toolbar-item-id="italic"]').first();
  const hintText = page.locator('.se-hints-bar__content');

  await boldBtn.click();
  await expect(hintText).toHaveText('HINT BOLD');

  // Click another action before auto-hide finishes; toolbar should force replacement.
  await italicBtn.click();
  await expect(hintText).toHaveText('HINT ITALIC');
});

test('history supports prev and next navigation', async ({ page }) => {
  await page.goto('/demo/');
  await page.waitForFunction(() => Boolean(window.editor));
  await setupDeterministicHints(page);

  const boldBtn = page.locator('[data-toolbar-item-id="bold"]').first();
  const italicBtn = page.locator('[data-toolbar-item-id="italic"]').first();
  const linkBtn = page.locator('[data-toolbar-item-id="link"]').first();
  const hintText = page.locator('.se-hints-bar__content');

  await boldBtn.click();
  await expect(hintText).toHaveText('HINT BOLD');

  await italicBtn.click();
  await expect(hintText).toHaveText('HINT ITALIC');

  await linkBtn.click();
  await expect(hintText).toHaveText('HINT LINK');

  await page.locator('[data-se-hint-prev]').click();
  await expect(hintText).toHaveText('HINT ITALIC');

  await page.locator('[data-se-hint-next]').click();
  await expect(hintText).toHaveText('HINT LINK');
});

test('after timeout, ghost state allows recalling previous hint', async ({ page }) => {
  await page.goto('/demo/');
  await page.waitForFunction(() => Boolean(window.editor));
  await setupDeterministicHints(page);

  const boldBtn = page.locator('[data-toolbar-item-id="bold"]').first();
  const hintText = page.locator('.se-hints-bar__content');

  await boldBtn.click();
  await expect(hintText).toHaveText('HINT BOLD');

  // Let auto-hide move bar into ghost state (history only).
  await page.waitForTimeout(260);

  const ghostPrev = page.locator('.se-hints-bar--ghost [data-se-hint-prev]');
  await expect(ghostPrev).toBeVisible();

  await ghostPrev.click();
  await expect(hintText).toHaveText('HINT BOLD');
});
