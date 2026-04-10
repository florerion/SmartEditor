import { test, expect } from '@playwright/test';

function makeBase64Payload(size) {
  return 'a'.repeat(size);
}

function buildBenchmarkMarkdown(imageCount = 6, imagePayloadSize = 260_000) {
  const images = Array.from({ length: imageCount }, (_, i) => {
    const payload = makeBase64Payload(imagePayloadSize + (i * 31));
    return `![img-${i + 1}](data:image/png;base64,${payload})`;
  }).join('\n\n');

  return [
    '# Perf Benchmark',
    '',
    '| col1 | col2 |',
    '| --- | --- |',
    '| a | b |',
    '| c | d |',
    '',
    images,
    '',
    'Tail benchmark line: 0',
  ].join('\n');
}

test('benchmark: incremental vs forced full preview render', async ({ page }) => {
  test.setTimeout(120_000);

  await page.goto('/demo/');
  await page.waitForFunction(() => !!window.editor);

  const doc = buildBenchmarkMarkdown(6, 260_000);

  const runScenario = async (mode) => {
    return page.evaluate(async ({ markdown, modeName }) => {
      const editor = window.editor;
      if (!editor) throw new Error('window.editor not found');

      const originalCanUseIncremental = editor._canUseIncrementalPreview?.bind(editor);
      if (modeName === 'full') {
        editor._canUseIncrementalPreview = () => false;
      } else if (typeof originalCanUseIncremental === 'function') {
        editor._canUseIncrementalPreview = originalCanUseIncremental;
      }

      editor.setMarkdown(markdown, { undoable: false });

      const originalUpdatePreview = editor._updatePreview.bind(editor);
      const timings = [];

      editor._updatePreview = (md, opts = {}) => {
        const t0 = performance.now();
        const result = originalUpdatePreview(md, opts);
        const t1 = performance.now();
        timings.push(t1 - t0);
        return result;
      };

      // Warm-up
      for (let i = 0; i < 4; i += 1) {
        const md = editor.getMarkdown().replace(/Tail benchmark line: \d+/, `Tail benchmark line: warm-${i}`);
        editor.setMarkdown(md, { undoable: false });
      }

      timings.length = 0;
      const start = performance.now();

      for (let i = 0; i < 20; i += 1) {
        const md = editor.getMarkdown().replace(/Tail benchmark line: [^\n]+/, `Tail benchmark line: ${i}`);
        editor.setMarkdown(md, { undoable: false });
      }

      const end = performance.now();

      editor._updatePreview = originalUpdatePreview;
      if (typeof originalCanUseIncremental === 'function') {
        editor._canUseIncrementalPreview = originalCanUseIncremental;
      }

      const sorted = [...timings].sort((a, b) => a - b);
      const pick = (ratio) => {
        if (!sorted.length) return 0;
        const index = Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * ratio));
        return sorted[index];
      };

      const avg = timings.length
        ? timings.reduce((acc, value) => acc + value, 0) / timings.length
        : 0;

      return {
        mode: modeName,
        iterations: timings.length,
        avgMs: avg,
        p50Ms: pick(0.5),
        p95Ms: pick(0.95),
        maxMs: sorted.length ? sorted[sorted.length - 1] : 0,
        totalMs: end - start,
      };
    }, { markdown: doc, modeName: mode });
  };

  const incremental = await runScenario('incremental');
  const full = await runScenario('full');

  const speedup = full.avgMs > 0 ? (full.avgMs - incremental.avgMs) / full.avgMs : 0;

  console.log('\n[perf] incremental:', incremental);
  console.log('[perf] full:', full);
  console.log(`[perf] speedup(avg): ${(speedup * 100).toFixed(1)}%`);

  expect(incremental.iterations).toBe(20);
  expect(full.iterations).toBe(20);
  expect(Number.isFinite(incremental.avgMs)).toBe(true);
  expect(Number.isFinite(full.avgMs)).toBe(true);
});
