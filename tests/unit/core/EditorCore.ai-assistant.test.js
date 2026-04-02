import { describe, expect, it, vi } from 'vitest';
import { EditorCore } from '../../../src/core/EditorCore.js';

function createEditor(value, opts = {}) {
  const host = document.createElement('div');
  host.style.height = '720px';
  document.body.appendChild(host);
  return new EditorCore(host, { value, ...opts });
}

describe('EditorCore AI assistant integration', () => {
  it('opens and closes assistant panel when enabled', () => {
    const provider = {
      isAvailable: vi.fn().mockResolvedValue(true),
      send: vi.fn().mockResolvedValue({ text: 'ok', suggestedMarkdown: '' }),
    };

    const editor = createEditor('# Hello', {
      ai: {
        enabled: true,
        provider,
      },
    });

    expect(editor.isAIAssistantOpen()).toBe(false);
    expect(editor.toggleAIAssistantPanel()).toBe(true);
    expect(editor.isAIAssistantOpen()).toBe(true);
    expect(editor.closeAIAssistantPanel()).toBe(false);

    editor.destroy();
  });

  it('requests AI response through configured provider', async () => {
    const provider = {
      isAvailable: vi.fn().mockResolvedValue(true),
      send: vi.fn().mockResolvedValue({
        text: 'Use shorter sentence.',
        suggestedMarkdown: 'Improved text.',
      }),
    };

    const onAIResponse = vi.fn();
    const editor = createEditor('Original text.', {
      ai: {
        enabled: true,
        provider,
      },
      onAIResponse,
    });

    editor.setSelection(0, 13);
    const result = await editor.requestAIAssistant({
      mode: 'improve-selection',
      instruction: 'Make it concise.',
    });

    expect(result.text).toContain('Use shorter sentence');
    expect(result.suggestedMarkdown).toBe('Improved text.');
    expect(provider.send).toHaveBeenCalledTimes(1);
    expect(onAIResponse).toHaveBeenCalledTimes(1);

    editor.destroy();
  });
});
