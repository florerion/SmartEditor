import { describe, expect, it, vi } from 'vitest';
import { PreviewPanel } from '../../src/ui/PreviewPanel.js';

describe('PreviewPanel sanitization and copy UX', () => {
  it('sanitizes unsafe HTML while preserving sync attributes', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const panel = new PreviewPanel(host, {
      onElementClick: () => {},
      onScroll: () => {},
    });

    panel.render('<p data-source-line="3" data-source-line-end="3">safe</p><script>alert(1)</script>');

    expect(panel.getHTML()).toContain('data-source-line="3"');
    expect(panel.getHTML()).not.toContain('<script>');

    panel.destroy();
  });

  it('copy button writes code text and toggles copied state', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const panel = new PreviewPanel(host, {
      onElementClick: () => {},
      onScroll: () => {},
    });

    const clipboardSpy = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
    panel.render('<div class="se-code-block"><button class="se-code-block__copy-btn" type="button"></button><pre><code>const x = 1;</code></pre></div>');

    const copyBtn = host.querySelector('.se-code-block__copy-btn');
    copyBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    await Promise.resolve();
    expect(clipboardSpy).toHaveBeenCalledWith('const x = 1;');
    expect(copyBtn.classList.contains('is-copied')).toBe(true);

    panel.destroy();
  });
});
