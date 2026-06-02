import { describe, expect, it, vi } from 'vitest';
import { ImageResize } from '../../../src/ui/ImageResize.js';

function createImageResize(markdown) {
  const previewEl = document.createElement('div');
  const img = document.createElement('img');
  img.className = 'se-image';
  previewEl.appendChild(img);

  const api = {
    getMarkdown: () => markdown,
    setMarkdown: vi.fn(),
  };

  const imageResize = new ImageResize(previewEl, () => api);
  return { api, img, imageResize };
}

describe('ImageResize', () => {
  it('prefers data-se-markdown-src when updating markdown after resize', () => {
    const { api, img, imageResize } = createImageResize('before\n![Alt](https://example.com/original.png)\nafter');
    img.setAttribute('src', 'https://example.com/rendered.png');
    img.setAttribute('data-se-markdown-src', 'https://example.com/original.png');

    imageResize._updateMarkdown(img, 120, 80);

    expect(api.setMarkdown).toHaveBeenCalledWith(
      'before\n![Alt|120x80](https://example.com/original.png)\nafter',
      { preservePreviewScroll: true },
    );

    imageResize.destroy();
  });

  it('falls back to src when markdown source attribute is missing', () => {
    const { api, img, imageResize } = createImageResize('before\n![Alt](https://example.com/rendered.png)\nafter');
    img.setAttribute('src', 'https://example.com/rendered.png');

    imageResize._updateMarkdown(img, 240, 160);

    expect(api.setMarkdown).toHaveBeenCalledWith(
      'before\n![Alt|240x160](https://example.com/rendered.png)\nafter',
      { preservePreviewScroll: true },
    );

    imageResize.destroy();
  });
});