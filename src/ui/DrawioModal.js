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
  }

  /**
   * Open draw.io editor.
   * @param {string} initialXml
   * @returns {Promise<string|null>} xml on save, null on cancel
   */
  open(initialXml = '') {
    this.close(null);

    this._pendingXml = initialXml || _defaultDiagramXml();

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

  /** @param {string|null} result */
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
      // draw.io can send xml directly in save event.
      if (typeof msg.xml === 'string' && msg.xml.length) {
        this.close(msg.xml);
        return;
      }
      // Ask explicitly for XML export if xml wasn't included.
      this._post({ action: 'export', format: 'xml', xml: 1, spin: 'Saving...' });
      return;
    }

    if (msg.event === 'export' && typeof msg.data === 'string') {
      this.close(msg.data);
      return;
    }

    if (msg.event === 'exit') {
      this.close(null);
    }
  }

  _post(payload) {
    this._iframe?.contentWindow?.postMessage(JSON.stringify(payload), '*');
  }
}

function _defaultDiagramXml() {
  return '<mxfile host="app.diagrams.net"><diagram id="d1" name="Page-1"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/></root></mxGraphModel></diagram></mxfile>';
}
