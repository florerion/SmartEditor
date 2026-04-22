/**
 * UX end-to-end benchmark: measures wall-clock time from a simulated keystroke
 * (insertText → CodeMirror onChange → debounce → _updatePreview → async settle)
 * to a stable preview. Compared for incremental vs forced full render mode.
 *
 * Run: npm run test:e2e -- e2e/ux-benchmark.spec.js --reporter=line
 */
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
    '# UX Benchmark',
    '',
    '| col1 | col2 |',
    '| --- | --- |',
    '| a | b |',
    '| c | d |',
    '',
    images,
    '',
    'Tail line.',
  ].join('\n');
}

test('benchmark: UX latency insertText → stable preview (incremental vs full)', async ({ page }) => {
  test.setTimeout(300_000);

  await page.goto('/demo/');
  await page.waitForFunction(() => !!window.editor);

  const doc = buildBenchmarkMarkdown(6, 260_000);

  // Load initial document and wait for full stabilization before benchmarking.
  await page.evaluate(async (markdown) => {
    const editor = window.editor;
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const poll = async (cond, interval = 80, timeout = 20_000) => {
      const deadline = Date.now() + timeout;
      while (Date.now() < deadline) {
        if (cond()) return true;
        await wait(interval);
      }
      return false;
    };
    editor.setMarkdown(markdown, { undoable: false });
    // Images are invalid base64 so they fire 'error' quickly, but give them time.
    await poll(() => !editor._hasPendingPreviewAsyncWork(), 80, 20_000);
    await wait(400);
  }, doc);

  /**
   * Run one timing scenario with the specified render mode.
   * Returns timing stats object.
   */
  const runScenario = async (mode) => {
    return page.evaluate(async ({ modeName, baseDoc }) => {
      const editor = window.editor;
      const wait = (ms) => new Promise((r) => setTimeout(r, ms));
      const poll = async (cond, interval = 30, timeout = 8_000) => {
        const deadline = Date.now() + timeout;
        while (Date.now() < deadline) {
          if (cond()) return true;
          await wait(interval);
        }
        return false;
      };

      // Demo enables html-phase preview rules that force full render path.
      // Disable them during this benchmark so incremental/full comparison is meaningful.
      const htmlRuleIdsToRestore = [];
      const allRules = typeof editor.getPreviewRules === 'function'
        ? editor.getPreviewRules()
        : [];
      allRules.forEach((rule) => {
        if (rule?.phase === 'html' && rule?.enabled !== false && rule?.id) {
          editor.disablePreviewRule(rule.id);
          htmlRuleIdsToRestore.push(rule.id);
        }
      });

      // Reset to clean state between modes.
      editor.setMarkdown(baseDoc, { undoable: false });
      await poll(() => !editor._hasPendingPreviewAsyncWork(), 60, 15_000);
      await wait(300);

      // Override incremental/full render mode.
      const origCanUse = editor._canUseIncrementalPreview?.bind(editor);
      if (modeName === 'full') {
        editor._canUseIncrementalPreview = () => false;
      } else if (typeof origCanUse === 'function') {
        editor._canUseIncrementalPreview = origCanUse;
      }

      // Intercept _updatePreview to capture the moment debounce fires.
      let renderStartMs = null;
      const origUpdatePreview = editor._updatePreview.bind(editor);
      editor._updatePreview = (md, opts) => {
        renderStartMs = performance.now();
        const result = origUpdatePreview(md, opts);
        return result;
      };

      const ITERATIONS = 10;
      const timings = [];

      try {
        // Warm-up: two edits to ensure caches/JIT are primed.
        for (let w = 0; w < 2; w += 1) {
          renderStartMs = null;
          editor.insertText('w');
          await poll(() => renderStartMs !== null, 30, 5_000);
          await poll(() => !editor._hasPendingPreviewAsyncWork(), 30, 5_000);
        }

        for (let i = 0; i < ITERATIONS; i += 1) {
          renderStartMs = null;

          const t0 = performance.now();

          // insertText triggers: CM change -> onChange -> _schedulePreviewUpdate (debounce).
          editor.insertText('x');

          // 1. Wait for debounce to fire (renderStartMs set at top of _updatePreview).
          const debounceOk = await poll(() => renderStartMs !== null, 30, 6_000);

          // 2. Wait for any async image loads / mermaid renders to settle.
          const asyncOk = await poll(() => !editor._hasPendingPreviewAsyncWork(), 30, 6_000);

          const t1 = performance.now();

          timings.push({
            total: t1 - t0,
            debounce: debounceOk ? renderStartMs - t0 : null,
            renderPlusSettle: debounceOk && asyncOk ? t1 - renderStartMs : null,
          });
        }
      } finally {
        // Restore overrides.
        editor._updatePreview = origUpdatePreview;
        if (typeof origCanUse === 'function') {
          editor._canUseIncrementalPreview = origCanUse;
        }
        htmlRuleIdsToRestore.forEach((id) => {
          editor.enablePreviewRule(id);
        });
      }

      const avg = (arr) => arr.reduce((s, v) => s + v, 0) / arr.length;
      const sorted = (arr) => [...arr].sort((a, b) => a - b);
      const pick = (arr, ratio) => {
        const s = sorted(arr);
        return s[Math.min(s.length - 1, Math.floor((s.length - 1) * ratio))];
      };

      const totals = timings.map((t) => t.total);
      const debounces = timings.map((t) => t.debounce).filter((v) => v !== null);
      const renders = timings.map((t) => t.renderPlusSettle).filter((v) => v !== null);

      return {
        mode: modeName,
        iterations: timings.length,
        debounceDelayMs: editor._calculateAdaptiveDebounceDelay?.() ?? null,
        total: { avgMs: avg(totals), p50Ms: pick(totals, 0.5), p95Ms: pick(totals, 0.95), maxMs: Math.max(...totals) },
        debounceWait: debounces.length
          ? { avgMs: avg(debounces), p50Ms: pick(debounces, 0.5) }
          : null,
        renderSettle: renders.length
          ? { avgMs: avg(renders), p50Ms: pick(renders, 0.5), p95Ms: pick(renders, 0.95) }
          : null,
      };
    }, { modeName: mode, baseDoc: doc });
  };

  const incremental = await runScenario('incremental');
  const full = await runScenario('full');

  const totalSpeedup = full.total.avgMs > 0
    ? (full.total.avgMs - incremental.total.avgMs) / full.total.avgMs
    : 0;
  const renderSpeedup = full.renderSettle?.avgMs > 0
    ? (full.renderSettle.avgMs - incremental.renderSettle.avgMs) / full.renderSettle.avgMs
    : 0;

  console.log('\n[ux-perf] incremental:', JSON.stringify(incremental, null, 2));
  console.log('[ux-perf] full:', JSON.stringify(full, null, 2));
  console.log(`\n--- UX Latency Summary ---`);
  console.log(`Configured debounce delay : ${incremental.debounceDelayMs}ms`);
  console.log(`Total UX latency  — incr : ${incremental.total.avgMs.toFixed(1)}ms avg  (p50=${incremental.total.p50Ms.toFixed(1)} p95=${incremental.total.p95Ms.toFixed(1)})`);
  console.log(`Total UX latency  — full : ${full.total.avgMs.toFixed(1)}ms avg  (p50=${full.total.p50Ms.toFixed(1)} p95=${full.total.p95Ms.toFixed(1)})`);
  console.log(`Total UX speedup         : ${(totalSpeedup * 100).toFixed(1)}%`);
  if (incremental.renderSettle && full.renderSettle) {
    console.log(`Render+settle     — incr : ${incremental.renderSettle.avgMs.toFixed(1)}ms avg`);
    console.log(`Render+settle     — full : ${full.renderSettle.avgMs.toFixed(1)}ms avg`);
    console.log(`Render speedup           : ${(renderSpeedup * 100).toFixed(1)}%`);
  }

  expect(incremental.iterations).toBe(10);
  expect(full.iterations).toBe(10);
  expect(Number.isFinite(incremental.total.avgMs)).toBe(true);
  expect(Number.isFinite(full.total.avgMs)).toBe(true);
});
