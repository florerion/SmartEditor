/**
 * draw.io embed modal using postMessage protocol.
 *
 * Works with https://embed.diagrams.net by default. For offline/self-hosted setup,
 * pass a custom URL via EditorCore option `drawio.url`.
 */
export class DrawioModal {
  /** @param {{ url?: string }} [opts] */
  constructor(opts = {}) {
    this._url = opts.url ?? 'https://embed.diagrams.net/?embed=1&proto=json&spin=1&ui=min&libraries=1';
    this._overlay = null;
    this._iframe = null;
    this._resolver = null;
    this._boundMsg = this._onMessage.bind(this);
    this._boundKey = this._onKey.bind(this);
    this._pendingXml = '';
    this._pendingSaveXml = '';
  }

  /**
   * Open draw.io editor.
   * @param {string} initialXml
    * @returns {Promise<{ xml: string, imageSrc: string }|null>} saved payload or null on cancel
   */
  open(initialXml = '') {
    this.close(null);

    this._pendingXml = initialXml || _defaultDiagramXml();
  this._pendingSaveXml = '';

    this._overlay = document.createElement('div');
    this._overlay.className = 'mde-drawio-overlay';
    this._overlay.innerHTML = `
      <div class="mde-drawio-modal" role="dialog" aria-modal="true" aria-label="draw.io editor">
        <div class="mde-drawio-modal__header">
          <h3 class="mde-drawio-modal__title">draw.io</h3>
          <button type="button" class="mde-drawio-modal__close" data-mde-drawio-close aria-label="Close">×</button>
        </div>
        <div class="mde-drawio-modal__frame-wrap"></div>
      </div>
    `;

    this._iframe = document.createElement('iframe');
    this._iframe.className = 'mde-drawio-modal__frame';
    this._iframe.src = this._url;
    this._iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups allow-forms allow-downloads');

    this._overlay.querySelector('.mde-drawio-modal__frame-wrap').appendChild(this._iframe);

    this._overlay.addEventListener('click', (e) => {
      if (e.target === this._overlay) this.close(null);
      if (e.target.closest('[data-mde-drawio-close]')) this.close(null);
    });

    document.body.appendChild(this._overlay);
    window.addEventListener('message', this._boundMsg);
    document.addEventListener('keydown', this._boundKey);

    return new Promise(resolve => {
      this._resolver = resolve;
    });
  }

  /** @param {{ xml: string, imageSrc: string }|null} result */
  close(result) {
    if (this._overlay) {
      this._overlay.remove();
      this._overlay = null;
      this._iframe = null;
      window.removeEventListener('message', this._boundMsg);
      document.removeEventListener('keydown', this._boundKey);
    }

    if (this._resolver) {
      const resolve = this._resolver;
      this._resolver = null;
      resolve(result);
    }
  }

  destroy() {
    this.close(null);
  }

  _onKey(e) {
    if (e.key === 'Escape') this.close(null);
  }

  _onMessage(e) {
    if (!this._iframe || e.source !== this._iframe.contentWindow) return;

    let msg = e.data;
    if (typeof msg === 'string') {
      try { msg = JSON.parse(msg); } catch { return; }
    }
    if (!msg || typeof msg !== 'object') return;

    if (msg.event === 'init') {
      this._post({ action: 'load', xml: this._pendingXml, autosave: 1 });
      return;
    }

    if (msg.event === 'save') {
      this._pendingSaveXml = (typeof msg.xml === 'string' && msg.xml.length)
        ? msg.xml
        : this._pendingXml;

      // Ask draw.io for a rendered SVG so markdown can store a base64 image.
      this._post({ action: 'export', format: 'svg', xml: 1, base64: 1, spin: 'Saving...' });
      return;
    }

    if (msg.event === 'export' && typeof msg.data === 'string') {
      const xml = this._pendingSaveXml || this._pendingXml;
      const imageSrc = this._normalizeExportData(msg.data);
      this.close({ xml, imageSrc });
      return;
    }

    if (msg.event === 'exit') {
      this.close(null);
    }
  }

  _post(payload) {
    this._iframe?.contentWindow?.postMessage(JSON.stringify(payload), '*');
  }

  _normalizeExportData(data) {
    const value = data.trim();
    if (value.startsWith('data:image/')) return value;
    if (value.startsWith('<svg')) {
      return `data:image/svg+xml;base64,${this._toBase64(value)}`;
    }
    if (/^[A-Za-z0-9+/=\r\n]+$/.test(value) && value.includes('PHN2Zy')) {
      return `data:image/svg+xml;base64,${value.replace(/\s+/g, '')}`;
    }
    // Safe fallback that still satisfies image markdown semantics.
    return _fallbackDrawioImage();
  }

  _toBase64(text) {
    const bytes = new TextEncoder().encode(text);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  }
}

function _defaultDiagramXml() {
  return '<mxfile host="app.diagrams.net"><diagram id="d1" name="Page-1"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/></root></mxGraphModel></diagram></mxfile>';
}

function _fallbackDrawioImage() {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="220" viewBox="0 0 640 220"><rect width="640" height="220" rx="16" fill="#eef6ff"/><rect x="24" y="24" width="592" height="172" rx="12" fill="#ffffff" stroke="#93c5fd"/><text x="320" y="118" text-anchor="middle" font-family="Arial" font-size="28" fill="#1d4ed8">draw.io diagram</text></svg>';
  const bytes = new TextEncoder().encode(svg);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return `data:image/svg+xml;base64,${btoa(binary)}`;
}
