import { describe, expect, it } from 'vitest';
import { EditorCore } from '../../src/core/EditorCore.js';

const HOSTED_URL = 'https://embed.diagrams.net/?embed=1&proto=json&spin=1&ui=min&libraries=1';

function createEditor(value = '# drawio', opts = {}) {
  const host = document.createElement('div');
  host.style.height = '720px';
  document.body.appendChild(host);
  return new EditorCore(host, { value, ...opts });
}

describe('draw.io hosting behavior', () => {
  it('uses hosted draw.io URL by default when no drawio.url is provided', () => {
    const editor = createEditor();

    expect(editor._drawioModal._url).toBe(HOSTED_URL);

    editor.destroy();
  });

  it('falls back to hosted URL when custom local URL fails and fallback is enabled', () => {
    const localUrl = 'https://example.com/local-drawio/?embed=1&proto=json&spin=1&ui=min&libraries=1';
    const editor = createEditor('# local', {
      drawio: {
        url: localUrl,
        allowHostedFallback: true,
      },
    });

    editor._drawioModal.open();
    editor._drawioModal._fallbackToHosted('test');

    expect(editor._drawioModal._iframe.src).toContain('https://embed.diagrams.net/');

    editor._drawioModal.close(null);
    editor.destroy();
  });

  it('does not fall back to hosted URL when allowHostedFallback is false', () => {
    const localUrl = 'https://example.com/local-drawio/?embed=1&proto=json&spin=1&ui=min&libraries=1';
    const editor = createEditor('# strict-offline', {
      drawio: {
        url: localUrl,
        allowHostedFallback: false,
      },
    });

    editor._drawioModal.open();
    editor._drawioModal._fallbackToHosted('test');

    expect(editor._drawioModal._iframe.src).toContain('https://example.com/local-drawio/');

    editor._drawioModal.close(null);
    editor.destroy();
  });
});
