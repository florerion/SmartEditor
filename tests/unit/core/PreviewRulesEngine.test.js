import { describe, expect, it, vi } from 'vitest';
import { PreviewRulesEngine } from '../../../src/core/preview/PreviewRulesEngine.js';

describe('PreviewRulesEngine', () => {
  it('executes markdown and html rules in order', () => {
    const engine = new PreviewRulesEngine();

    engine.register({
      id: 'md-1',
      phase: 'markdown',
      order: 10,
      run: (input) => `${input}\nAppended`,
    });

    engine.register({
      id: 'html-1',
      phase: 'html',
      order: 10,
      run: (input) => input.replace('Appended', 'Replaced'),
    });

    const md = engine.executePhaseSync('markdown', '# Title', {
      markdown: '# Title',
      selection: { from: 0, to: 0 },
      renderVersion: 1,
    });
    expect(md.content).toContain('Appended');

    const html = engine.executePhaseSync('html', '<p>Appended</p>', {
      markdown: md.content,
      selection: { from: 0, to: 0 },
      renderVersion: 1,
    });
    expect(html.content).toContain('Replaced');

    const metrics = engine.getMetrics();
    expect(metrics.byRule['md-1'].runs).toBe(1);
    expect(metrics.byRule['html-1'].runs).toBe(1);

    engine.destroy();
  });

  it('continues when a rule throws and failMode is continue', () => {
    const onRuleError = vi.fn();
    const engine = new PreviewRulesEngine({ onRuleError });

    engine.register({
      id: 'broken',
      phase: 'markdown',
      order: 1,
      run: () => {
        throw new Error('boom');
      },
    });

    engine.register({
      id: 'ok',
      phase: 'markdown',
      order: 2,
      run: (input) => `${input}\nok`,
    });

    const result = engine.executePhaseSync('markdown', 'x', {
      markdown: 'x',
      selection: { from: 0, to: 0 },
      renderVersion: 1,
    });

    expect(result.content).toContain('ok');
    expect(onRuleError).toHaveBeenCalledTimes(1);

    engine.destroy();
  });

  it('supports async phase execution', async () => {
    const engine = new PreviewRulesEngine();

    engine.register({
      id: 'async-md',
      phase: 'markdown',
      async: true,
      run: async (input) => `${input} async`,
    });

    const result = await engine.executePhaseAsync('markdown', 'hello', {
      markdown: 'hello',
      selection: { from: 0, to: 0 },
      renderVersion: 1,
      signal: null,
    });

    expect(result.content).toBe('hello async');

    engine.destroy();
  });
});
