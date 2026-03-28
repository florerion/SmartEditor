/**
 * Attaches resize handles to <img class="se-image"> elements in the preview panel.
 *
 * UX:
 *  - Hover over image → a small drag-handle appears in the bottom-right corner.
 *  - Drag horizontally → image resizes proportionally.
 *  - Release → markdown is updated: `![alt](src)` becomes `![alt|WxH](src)`.
 *
 * The resize information is stored in the alt text as "|WxH" suffix so it is
 * compatible with the custom markdown-it image renderer in Parser.js and can be
 * shipped as-is to Eleventy (with the matching plugin).
 */
export class ImageResize {
  /**
   * @param {HTMLElement}  previewEl  The preview panel root element
   * @param {() => object} getAPI     Lazy accessor returning the EditorCore public API
   */
  constructor(previewEl, getAPI) {
    this._previewEl  = previewEl;
    this._getAPI     = getAPI;
    this._activeImg  = null;
    this._dragging   = false;
    this._startX     = 0;
    this._startW     = 0;
    this._startH     = 0;
    this._overHandle = false;

    this._handle = this._createHandle();

    this._boundMove = this._onMouseMove.bind(this);
    this._boundUp   = this._onMouseUp.bind(this);
    document.addEventListener('mousemove', this._boundMove);
    document.addEventListener('mouseup',   this._boundUp);
  }

  /**
   * Call after each preview re-render to re-attach hover listeners to new <img> elements.
   */
  attachHandlers() {
    this._previewEl.querySelectorAll('img.se-image').forEach(img => {
      img.style.cursor = 'default';
      img.addEventListener('mouseenter', () => this._showHandle(img));
      img.addEventListener('mouseleave', () => this._scheduleHideHandle());
    });
  }

  destroy() {
    document.removeEventListener('mousemove', this._boundMove);
    document.removeEventListener('mouseup',   this._boundUp);
    this._handle.remove();
  }

  // ------ private ------

  _createHandle() {
    const el = document.createElement('div');
    el.className = 'se-img-resize-handle';
    el.title = 'Drag to resize image';
    el.style.display = 'none';
    document.body.appendChild(el);

    el.addEventListener('mouseenter', () => { this._overHandle = true; });
    el.addEventListener('mouseleave', () => {
      this._overHandle = false;
      this._scheduleHideHandle();
    });

    el.addEventListener('mousedown', (e) => {
      if (!this._activeImg) return;
      this._dragging = true;
      this._startX   = e.clientX;
      this._startW   = this._activeImg.offsetWidth;
      this._startH   = this._activeImg.offsetHeight;
      document.body.style.cursor     = 'se-resize';
      document.body.style.userSelect = 'none';
      e.preventDefault();
    });

    return el;
  }

  _showHandle(img) {
    this._activeImg = img;
    this._repositionHandle(img);
    this._handle.style.display = 'block';
  }

  _repositionHandle(img) {
    const rect = img.getBoundingClientRect();
    const SIZE = 16;
    const margin = 1;

    // Handle uses position: fixed, so coordinates must stay in viewport space.
    this._handle.style.left = `${Math.round(rect.right - SIZE - margin)}px`;
    this._handle.style.top = `${Math.round(rect.bottom - SIZE - margin)}px`;
  }

  _scheduleHideHandle() {
    setTimeout(() => {
      if (!this._overHandle && !this._dragging) {
        this._handle.style.display = 'none';
        this._activeImg = null;
      }
    }, 120);
  }

  _onMouseMove(e) {
    if (!this._dragging || !this._activeImg) return;
    const dx    = e.clientX - this._startX;
    const newW  = Math.max(20, this._startW + dx);
    const ratio = this._startH / (this._startW || 1);
    const newH  = Math.round(newW * ratio);

    this._activeImg.style.width  = `${newW}px`;
    this._activeImg.style.height = `${newH}px`;
    this._repositionHandle(this._activeImg);
  }

  _onMouseUp() {
    if (!this._dragging) return;
    this._dragging = false;
    document.body.style.cursor     = '';
    document.body.style.userSelect = '';

    if (!this._activeImg) return;

    const newW = Math.round(this._activeImg.offsetWidth);
    const newH = Math.round(this._activeImg.offsetHeight);
    this._updateMarkdown(this._activeImg, newW, newH);

    this._handle.style.display = 'none';
    this._activeImg = null;
  }

  _updateMarkdown(img, width, height) {
    const api = this._getAPI();
    const md  = api.getMarkdown();
    const src = img.getAttribute('src') ?? '';

    let newMd;

    if (src.startsWith('data:')) {
      // For base64 images match via data URI prefix up to the comma
      // (avoids a regex containing 100KB of base64)
      const commaIdx = src.indexOf(',');
      const prefix   = src.slice(0, commaIdx + 1); // e.g. "data:image/png;base64,"
      const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      newMd = md.replace(
        new RegExp(`!\\[([^\\]]*)\\]\\(${escapedPrefix}[^)]*\\)`),
        (_, altPart) => `![${_cleanAlt(altPart)}|${width}x${height}](${src})`,
      );
    } else {
      const escapedSrc = src.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      newMd = md.replace(
        new RegExp(`!\\[([^\\]]*)\\]\\(${escapedSrc}\\)`, 'g'),
        (_, altPart) => `![${_cleanAlt(altPart)}|${width}x${height}](${src})`,
      );
    }

    if (newMd !== md) api.setMarkdown(newMd, { preservePreviewScroll: true });
  }
}

/** Strip existing |WxH suffix from alt text before writing new dimensions */
function _cleanAlt(alt) {
  return alt.replace(/\|\d+x\d+$/, '');
}
