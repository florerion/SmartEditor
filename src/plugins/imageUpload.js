/**
 * Handles image insertion from three sources:
 *  1. Clipboard paste (Ctrl+V with an image)
 *  2. Drag-and-drop onto the editor
 *  3. Toolbar button → file picker
 *
 * Upload flow:
 *  - If `upload.endpoint` is configured → POST (FormData) → expect { url: '...' }
 *  - On network error OR no endpoint → fall back to base64 data URI
 */
export class ImageUploadHandler {
  /**
   * @param {HTMLElement}  editorEl   Root element of the editor (for paste/drop listeners)
   * @param {() => object} getAPI     Lazy accessor returning the EditorCore public API
   * @param {object}       [uploadOpts]                Options from `new EditorCore(el, { upload: {...} })`
   * @param {string}       [uploadOpts.endpoint]       POST endpoint URL. If omitted, falls back to base64.
   * @param {object}       [uploadOpts.headers]        Extra HTTP headers sent with the upload request.
   * @param {object}       [uploadOpts.extraFields]    Extra FormData fields appended to every upload
   *                                                   (e.g. `{ upload_preset: 'my_preset' }` for Cloudinary).
   * @param {string}       [uploadOpts.responseUrlField='url']  Response JSON field that holds the asset URL
   *                                                   (e.g. `'secure_url'` for Cloudinary).
   * @param {string[]}     [uploadOpts.formats]        Allowed MIME types.
   * @param {number}       [uploadOpts.maxSize]        Max file size in bytes (default 5 MB).
   * @param {object}       callbacks  { onUploadStart, onUploadDone, onUploadError }
   */
  constructor(editorEl, getAPI, uploadOpts, callbacks) {
    this._el       = editorEl;
    this._getAPI   = getAPI;
    this._opts     = uploadOpts  ?? {};
    this._cbs      = callbacks   ?? {};

    this._boundPaste    = this._onPaste.bind(this);
    this._boundDrop     = this._onDrop.bind(this);
    this._boundDragover = (e) => e.preventDefault();

    this._el.addEventListener('paste',    this._boundPaste);
    this._el.addEventListener('drop',     this._boundDrop);
    this._el.addEventListener('dragover', this._boundDragover);
  }

  /**
   * Process a File object: validate → upload or base64 → insertText.
   * @param {File} file
   */
  async handleFile(file) {
    const allowed = this._opts.formats ?? [
      'image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml',
    ];
    const maxSize = this._opts.maxSize ?? 5 * 1024 * 1024;

    if (!allowed.includes(file.type)) {
      const err = new Error(`Unsupported image format: ${file.type}`);
      this._cbs.onUploadError?.(file, err);
      return;
    }
    if (file.size > maxSize) {
      const err = new Error(`Image too large (${Math.round(file.size / 1024)} KB > ${Math.round(maxSize / 1024)} KB)`);
      this._cbs.onUploadError?.(file, err);
      return;
    }

    this._cbs.onUploadStart?.(file);

    const api = this._getAPI();
    const runTask = typeof api.runWithBusy === 'function'
      ? api.runWithBusy.bind(api)
      : async (task) => task({ signal: new AbortController().signal, update: () => {} });

    try {
      await runTask(async ({ signal, update }) => {
        update({
          label: 'Uploading image...',
          detail: file.name ? `File: ${file.name}` : '',
        });

        if (this._opts.endpoint) {
          try {
            const url = await this._upload(file, signal);
            this._getAPI().insertText(`![](${url})`);
            this._cbs.onUploadDone?.(file, url);
            return;
          } catch (err) {
            if (_isAbortError(err)) throw err;

            const warningDetail = file.name
              ? `Upload failed for ${file.name}. Using local fallback.`
              : 'Upload failed. Using local fallback.';
            update({ label: 'Uploading image...', detail: warningDetail });
            console.warn('[imageUpload] Upload failed, using base64 fallback:', err.message);
            this._cbs.onUploadError?.(file, err);
          }
        }

        const b64 = await this._toBase64(file, signal);
        this._getAPI().insertText(`![](${b64})`);
        this._cbs.onUploadDone?.(file, b64);
      }, {
        label: 'Uploading image...',
        detail: file.name ? `File: ${file.name}` : '',
        lock: true,
        scope: 'global',
        cancellable: true,
      });
    } catch (err) {
      if (_isAbortError(err)) return;
      this._cbs.onUploadError?.(file, err);
      console.warn('[imageUpload] Unexpected error:', err);
    }
  }

  destroy() {
    this._el.removeEventListener('paste',    this._boundPaste);
    this._el.removeEventListener('drop',     this._boundDrop);
    this._el.removeEventListener('dragover', this._boundDragover);
  }

  // ------ private ------

  async _upload(file, signal) {
    const body = new FormData();
    body.append('file', file);
    for (const [key, val] of Object.entries(this._opts.extraFields ?? {})) {
      body.append(key, String(val));
    }
    const headers = { ...this._opts.headers };

    const resp = await fetch(this._opts.endpoint, { method: 'POST', body, headers, signal });
    if (!resp.ok) throw new Error(`HTTP ${resp.status} ${resp.statusText}`);

    const data = await resp.json();
    const urlField = this._opts.responseUrlField ?? 'url';
    if (typeof data?.[urlField] !== 'string') throw new Error(`Upload response missing "${urlField}" field`);
    return data[urlField];
  }

  _toBase64(file, signal) {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) {
        reject(new DOMException('The operation was aborted.', 'AbortError'));
        return;
      }

      const reader = new FileReader();

      const onAbort = () => {
        reader.abort();
        reject(new DOMException('The operation was aborted.', 'AbortError'));
      };

      if (signal) {
        signal.addEventListener('abort', onAbort, { once: true });
      }

      reader.onload = (e) => {
        signal?.removeEventListener('abort', onAbort);
        resolve(e.target.result);
      };
      reader.onerror = (error) => {
        signal?.removeEventListener('abort', onAbort);
        reject(error);
      };
      reader.onabort = () => {
        signal?.removeEventListener('abort', onAbort);
        reject(new DOMException('The operation was aborted.', 'AbortError'));
      };

      reader.readAsDataURL(file);
    });
  }

  _onPaste(event) {
    const items = event.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        event.preventDefault();
        const file = item.getAsFile();
        if (file) this.handleFile(file);
        return;
      }
    }
  }

  _onDrop(event) {
    event.preventDefault();
    const files = event.dataTransfer?.files;
    if (!files?.length) return;
    for (const file of files) {
      if (file.type.startsWith('image/')) {
        this.handleFile(file);
      }
    }
  }
}

/**
 * Create a toolbar action for the file-picker upload button.
 * Must be called after ImageUploadHandler is instantiated so the handler ref is available.
 *
 * @param {ImageUploadHandler} handler
 * @returns {object}  Toolbar action definition
 */
export function createImageUploadAction(handler) {
  return {
    id: 'image-upload',
    title: 'Upload image (or paste / drop)',
    group: 'insert',
    order: 42,
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/></svg>`,
    run() {
      const input = document.createElement('input');
      input.type    = 'file';
      input.accept  = 'image/*';
      input.style.display = 'none';
      document.body.appendChild(input);
      input.addEventListener('change', () => {
        const file = input.files?.[0];
        document.body.removeChild(input);
        if (file) handler.handleFile(file);
      });
      input.click();
    },
  };
}

function _isAbortError(error) {
  return error?.name === 'AbortError';
}
