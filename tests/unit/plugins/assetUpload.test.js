import { describe, expect, it, vi } from 'vitest';
import { AssetUploadHandler } from '../../../src/plugins/assetUpload.js';

function createApi() {
  const state = {
    markdown: '',
    selection: { from: 0, to: 0, lineFrom: 0, lineTo: 0, text: '' },
    insertedText: '',
    insertPosition: 0,
    focused: false,
  };

  return {
    getSelection() {
      return state.selection;
    },
    insertText(text, pos) {
      state.insertedText = text;
      state.insertPosition = pos;
      state.markdown = `${state.markdown.slice(0, pos)}${text}${state.markdown.slice(pos)}`;
    },
    setSelection(from, to) {
      state.selection = { ...state.selection, from, to };
    },
    focus() {
      state.focused = true;
    },
    runWithBusy(task) {
      return task({ signal: new AbortController().signal, update: () => {} });
    },
    flashError: vi.fn(),
    readState() {
      return state;
    },
  };
}

describe('AssetUploadHandler', () => {
  it('passes upload.credentials to fetch when configured', async () => {
    const editorEl = document.createElement('div');
    const api = createApi();
    const fetchSpy = vi.fn(async () => ({
      ok: true,
      json: async () => ({ url: 'https://cdn.example.com/a.png' }),
    }));
    globalThis.fetch = fetchSpy;

    const handler = new AssetUploadHandler(
      editorEl,
      () => api,
      {
        endpoint: '/upload',
        credentials: 'include',
      },
      {},
    );

    const file = new File(['abc'], 'a.png', { type: 'image/png' });
    await handler.handleFile(file);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [, requestInit] = fetchSpy.mock.calls[0];
    expect(requestInit.credentials).toBe('include');
    expect(api.readState().insertedText).toContain('https://cdn.example.com/a.png');

    handler.destroy();
  });
});
