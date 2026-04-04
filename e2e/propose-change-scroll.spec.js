import { expect, test } from '@playwright/test';

test('accepting proposeChange replace-all keeps code view on the last added line', async ({ page }) => {
  await page.goto('/demo/');
  await page.waitForFunction(() => Boolean(window.editor));

  const baseLines = Array.from({ length: 120 }, (_, index) => `Base line ${index + 1}`);
  const proposedLines = [
    ...baseLines,
    'Accepted addition 1',
    'Accepted addition 2',
  ];

  const beforePreviewScroll = await page.evaluate((markdown) => {
    window.editor.setMarkdown(markdown);
    window.editor.setSelection(0, 0);
    window.editor._codePanel._scroller.scrollTop = 0;
    window.editor._previewPanel.getRoot().scrollTop = 620;
    return window.editor._previewPanel.getRoot().scrollTop;
  }, baseLines.join('\n'));

  await page.evaluate((markdown) => {
    void window.editor.proposeChange(markdown, { mode: 'replace-all' });
  }, proposedLines.join('\n'));

  await expect(page.locator('[data-se-diff-accept]')).toBeVisible();
  await page.locator('[data-se-diff-accept]').click();

  await page.waitForFunction(() => {
    if (!window.editor) return false;
    const selection = window.editor.getSelection();
    const docLines = window.editor._codePanel._view.state.doc.lines;
    return selection.lineFrom === docLines - 1;
  });

  const state = await page.evaluate(() => {
    const codePanel = window.editor._codePanel;
    const scroller = codePanel._scroller;
    const head = codePanel._view.state.selection.main.head;
    const coords = codePanel._view.coordsAtPos(head);
    const rect = scroller.getBoundingClientRect();
    const selection = window.editor.getSelection();
    const lineText = codePanel._view.state.doc.line(selection.lineFrom + 1).text;

    return {
      scrollTop: scroller.scrollTop,
      viewportHeight: rect.height,
      relativeTop: coords ? coords.top - rect.top : null,
      relativeBottom: coords ? coords.bottom - rect.top : null,
      lineFrom: selection.lineFrom,
      docLines: codePanel._view.state.doc.lines,
      lineText,
      previewScrollTop: window.editor._previewPanel.getRoot().scrollTop,
    };
  });

  expect(state.lineFrom).toBe(state.docLines - 1);
  expect(state.lineText).toBe('Accepted addition 2');
  expect(state.scrollTop).toBeGreaterThan(0);
  expect(state.relativeTop).not.toBeNull();
  expect(state.relativeBottom).not.toBeNull();
  expect(state.relativeTop).toBeGreaterThanOrEqual(0);
  expect(state.relativeBottom).toBeLessThanOrEqual(state.viewportHeight);
  expect(Math.abs(state.previewScrollTop - beforePreviewScroll)).toBeLessThan(20);
});

test('proposeChange modal opens near the first change and keeps both panes scroll-synced', async ({ page }) => {
  await page.goto('/demo/');
  await page.waitForFunction(() => Boolean(window.editor));

  const baseLines = Array.from({ length: 180 }, (_, index) => `Paragraph line ${index + 1}`);

  await page.evaluate((lines) => {
    const markdown = lines.join('\n');
    window.editor.setMarkdown(markdown);

    const targetLineIndex = 96;
    const start = lines.slice(0, targetLineIndex).join('\n').length + 1;
    const end = start + lines[targetLineIndex].length;

    window.editor.setSelection(start, end);
    void window.editor.proposeChange('Accepted replacement line 1\nAccepted replacement line 2', {
      mode: 'replace-selection',
    });
  }, baseLines);

  await expect(page.locator('[data-se-diff-accept]')).toBeVisible();

  await page.waitForFunction(() => {
    const oldPre = document.querySelector('.se-diff__pre--old');
    const newPre = document.querySelector('.se-diff__pre--new');
    return Boolean(oldPre && newPre && oldPre.scrollTop > 0 && newPre.scrollTop > 0);
  });

  const state = await page.evaluate(() => {
    const oldPre = document.querySelector('.se-diff__pre--old');
    const newPre = document.querySelector('.se-diff__pre--new');

    const initial = {
      oldScrollTop: oldPre.scrollTop,
      newScrollTop: newPre.scrollTop,
    };

    oldPre.scrollTop = Math.min(oldPre.scrollTop + 220, oldPre.scrollHeight - oldPre.clientHeight);
    oldPre.dispatchEvent(new Event('scroll'));

    const synced = {
      oldScrollTop: oldPre.scrollTop,
      newScrollTop: newPre.scrollTop,
      oldRatio: (oldPre.scrollHeight - oldPre.clientHeight) > 0
        ? oldPre.scrollTop / (oldPre.scrollHeight - oldPre.clientHeight)
        : 0,
      newRatio: (newPre.scrollHeight - newPre.clientHeight) > 0
        ? newPre.scrollTop / (newPre.scrollHeight - newPre.clientHeight)
        : 0,
    };

    return { initial, synced };
  });

  expect(state.initial.oldScrollTop).toBeGreaterThan(0);
  expect(state.initial.newScrollTop).toBeGreaterThan(0);
  expect(state.synced.oldScrollTop).toBeGreaterThan(state.initial.oldScrollTop);
  expect(state.synced.newScrollTop).toBeGreaterThan(state.initial.newScrollTop);
  expect(Math.abs(state.synced.oldRatio - state.synced.newRatio)).toBeLessThan(0.03);

  await page.locator('[data-se-diff-cancel]').first().click();
});