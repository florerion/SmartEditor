import { expect, test } from '@playwright/test';

const BROKEN_TABLE = [
  'A | B',
  '| -- | ---',
  '1 | 2 | 3',
  '| 4 | 5',
].join('\n');

test('compatibility panel supports single fix and fix all flow', async ({ page }) => {
  await page.goto('/demo/');
  await page.waitForFunction(() => Boolean(window.editor));

  const totalIssues = await page.evaluate((value) => {
    window.editor.setMarkdown(value);
    const report = window.editor.validateCompatibility({ force: true });
    return report.summary.total;
  }, BROKEN_TABLE);

  expect(totalIssues).toBeGreaterThan(0);
  await expect(page.locator('[data-se-compat-fix-first]')).toBeVisible();

  await page.locator('[data-se-compat-fix-first]').click();
  await page.locator('[data-se-diff-accept]').click();

  await expect(page.locator('.se-compatibility__issues')).toContainText('table.');

  await page.locator('[data-se-compat-fix-all]').click();
  await page.locator('[data-se-diff-accept]').click();

  await expect(page.locator('.se-compatibility__issues')).toContainText('No compatibility issues detected.');
});
