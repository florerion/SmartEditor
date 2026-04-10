import { expect, test } from '@playwright/test';

function makeBase64Payload(size, ch = 'a') {
  return ch.repeat(size);
}

test('code-to-preview line mapping stays correct after inserting large image blocks', async ({ page }) => {
  await page.goto('/demo/');
  await page.waitForFunction(() => Boolean(window.editor));

  const initialImage = `![img-1](data:image/png;base64,${makeBase64Payload(260_000, 'x')})`;
  const addedImage = `![img-2](data:image/png;base64,${makeBase64Payload(260_000, 'y')})`;

  const initialMarkdown = [
    '| col1 | col2 |',
    '| --- | --- |',
    '| a | b |',
    '',
    initialImage,
    '',
    'Target paragraph line',
  ].join('\n');

  await page.evaluate(async ({ md, img }) => {
    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const poll = async (cond, interval = 30, timeout = 6000) => {
      const deadline = Date.now() + timeout;
      while (Date.now() < deadline) {
        if (cond()) return true;
        await wait(interval);
      }
      return false;
    };

    window.editor.setMarkdown(md, { undoable: false });
    await poll(() => !window.editor._hasPendingPreviewAsyncWork(), 50, 8000);

    // Insert a second large image before the target paragraph using the editor API
    // so we exercise the same debounced typing/update path as real usage.
    const marker = 'Target paragraph line';
    const current = window.editor.getMarkdown();
    const markerPos = current.indexOf(marker);
    window.editor.setSelection(markerPos, markerPos);
    window.editor.insertText(`${img}\n\n`);

    await poll(() => window.editor._pinPreviewScrollTop === null, 30, 8000);
    await poll(() => !window.editor._scrollSyncSuppressed, 30, 8000);
  }, { md: initialMarkdown, img: addedImage });

  const mapping = await page.evaluate(() => {
    const markdown = window.editor.getMarkdown();
    const lines = markdown.split('\n');
    const targetLine = lines.findIndex((line) => line.includes('Target paragraph line'));
    const targetOffset = lines.slice(0, targetLine).join('\n').length + (targetLine > 0 ? 1 : 0);

    window.editor.setSelection(targetOffset, targetOffset);

    const highlighted = document.querySelector('.se-sync-highlight[data-source-line]');
    const previewRoot = window.editor._previewPanel.getRoot();
    const tableCell = previewRoot.querySelector('tbody tr:last-child td:first-child');

    return {
      targetLine,
      highlightedLine: highlighted ? Number.parseInt(highlighted.getAttribute('data-source-line'), 10) : null,
      highlightedText: highlighted ? (highlighted.textContent || '').trim() : '',
      tableLine: tableCell ? Number.parseInt(tableCell.getAttribute('data-source-line'), 10) : null,
    };
  });

  expect(mapping.targetLine).toBeGreaterThan(0);
  expect(mapping.tableLine).toBe(2);
  expect(mapping.highlightedLine).toBe(mapping.targetLine);
  expect(mapping.highlightedText).toContain('Target paragraph line');
});
