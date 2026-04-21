/**
 * Handles asset insertion from three sources:
 *  1. Clipboard paste (Ctrl+V with a file)
 *  2. Drag-and-drop onto the editor
 *  3. Toolbar button → file picker
 *
 * Upload flow:
 *  - If an endpoint resolves for the file → POST (FormData) → expect { url: '...' }
 *  - Endpoint resolution order: `upload.endpoints` pattern-map first, then `upload.endpoint` fallback.
 *  - On network error OR no endpoint → images fall back to base64 data URI; non-images are rejected.
 *
 * Markdown insertion:
 *  - images: `![](...)`
 *  - files: `[file-name.ext](...)`
 */
export class AssetUploadHandler {
  /**
   * @param {HTMLElement}  editorEl   Root element of the editor (for paste/drop listeners)
   * @param {() => object} getAPI     Lazy accessor returning the EditorCore public API
   * @param {object}       [uploadOpts]                Options from `new EditorCore(el, { upload: {...} })`
  * @param {string}       [uploadOpts.endpoint]       Default POST endpoint URL for all file types.
  *                                                   If omitted, images fall back to base64; non-images are rejected.
  * @param {Object.<string,string>} [uploadOpts.endpoints]  Per-type endpoint overrides, checked before `endpoint`.
  *                                                   Keys use the same pattern syntax as `fileFormats`/`formats`:
  *                                                   MIME type (`'image/png'`), wildcard (`'image/*'`),
  *                                                   or extension (`'.pdf'`). First matching entry wins.
  *                                                   Example: `{ 'image/*': '/img/upload', '.pdf': '/doc/upload' }`
  * @param {object}       [uploadOpts.headers]        Extra HTTP headers sent with the upload request.
  * @param {'omit'|'same-origin'|'include'} [uploadOpts.credentials] Fetch credentials mode for upload requests.
   * @param {object}       [uploadOpts.extraFields]    Extra FormData fields appended to every upload
   *                                                   (e.g. `{ upload_preset: 'my_preset' }` for Cloudinary).
   * @param {string}       [uploadOpts.responseUrlField='url']  Response JSON field that holds the asset URL
   *                                                   (e.g. `'secure_url'` for Cloudinary).
   * @param {string[]}     [uploadOpts.formats]        Allowed image MIME types.
   * @param {string[]}     [uploadOpts.fileFormats]    Allowed non-image file MIME types/extensions (e.g. `.pdf`).
   *                                                   If omitted, non-image files are accepted.
   * @param {number}       [uploadOpts.maxSize]        Max image size in bytes (default 5 MB).
   * @param {number}       [uploadOpts.fileMaxSize]    Max non-image file size in bytes (default equals `maxSize`).
   * @param {string}       [uploadOpts.pickerAccept]   Value for file input `accept` attribute.
   *                                                   Defaults to allowing any file type.
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
    const isImage = _isImageFile(file);
    const allowedImages = this._opts.formats ?? [
      'image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml',
    ];
    const maxImageSize = this._opts.maxSize ?? 5 * 1024 * 1024;
    const maxFileSize = this._opts.fileMaxSize ?? maxImageSize;

    if (isImage && !_matchesAllowedType(file, allowedImages)) {
      const err = new Error(`Unsupported image format: ${file.type || file.name || 'unknown'}`);
      this._cbs.onUploadError?.(file, err);
      this._getAPI().flashError?.(err.message);
      return;
    }

    if (!isImage && Array.isArray(this._opts.fileFormats) && this._opts.fileFormats.length) {
      if (!_matchesAllowedType(file, this._opts.fileFormats)) {
        const err = new Error(`Unsupported file format: ${file.type || file.name || 'unknown'}`);
        this._cbs.onUploadError?.(file, err);
        this._getAPI().flashError?.(err.message);
        return;
      }
    }

    const maxSize = isImage ? maxImageSize : maxFileSize;
    if (file.size > maxSize) {
      const kind = isImage ? 'Image' : 'File';
      const err = new Error(`${kind} too large (${Math.round(file.size / 1024)} KB > ${Math.round(maxSize / 1024)} KB)`);
      this._cbs.onUploadError?.(file, err);
      this._getAPI().flashError?.(err.message);
      return;
    }

    this._cbs.onUploadStart?.(file);

    const api = this._getAPI();
    const runTask = typeof api.runWithBusy === 'function'
      ? api.runWithBusy.bind(api)
      : async (task) => task({ signal: new AbortController().signal, update: () => {} });

    // Collects error message from inside the busy task so we can flash it
    // after the task (and its loading overlay) have been dismissed.
    let pendingErrorFlash = null;
    let pendingSelection = null;

    try {
      await runTask(async ({ signal, update }) => {
        update({
          label: isImage ? 'Uploading image...' : 'Uploading file...',
          detail: file.name ? `File: ${file.name}` : '',
        });

        if (this._resolveEndpoint(file)) {
          try {
            const url = await this._upload(file, signal);
            pendingSelection = this._insertMarkdown(file, url);
            this._cbs.onUploadDone?.(file, url);
            return;
          } catch (err) {
            if (_isAbortError(err)) throw err;

            // For non-image files, base64 fallback produces an unusable data-URI link
            // in markdown — refuse and surface the original upload error.
            if (!isImage) {
              console.warn('[assetUpload] Upload failed for non-image file, no fallback:', err.message);
              this._cbs.onUploadError?.(file, err);
              pendingErrorFlash = err.message;
              return;
            }

            const warningDetail = file.name
              ? `Upload failed for ${file.name}. Using local fallback.`
              : 'Upload failed. Using local fallback.';
            update({ label: 'Uploading image...', detail: warningDetail });
            console.warn('[assetUpload] Upload failed, using base64 fallback:', err.message);
            this._cbs.onUploadError?.(file, err);
          }
        } else if (!isImage) {
          // No endpoint and file is not an image: base64 is meaningless for binary files.
          const err = new Error(
            `Cannot insert "${file.name || 'file'}": upload.endpoint (or upload.endpoints) is required for non-image files.`,
          );
          this._cbs.onUploadError?.(file, err);
          pendingErrorFlash = err.message;
          console.warn('[assetUpload]', err.message);
          return;
        }

        // Image-only fallback path: embed as base64 data URI.
        const b64 = await this._toBase64(file, signal);
        pendingSelection = this._insertMarkdown(file, b64);
        this._cbs.onUploadDone?.(file, b64);
      }, {
        label: isImage ? 'Uploading image...' : 'Uploading file...',
        detail: file.name ? `File: ${file.name}` : '',
        lock: true,
        scope: 'global',
        cancellable: true,
      });
    } catch (err) {
      if (_isAbortError(err)) return;
      this._cbs.onUploadError?.(file, err);
      console.warn('[assetUpload] Unexpected error:', err);
      this._getAPI().flashError?.(err.message || 'Upload failed');
      return;
    }

    if (pendingSelection) {
      const api = this._getAPI();
      api.setSelection(pendingSelection.from, pendingSelection.to);
      api.focus?.();
    }

    if (pendingErrorFlash) {
      this._getAPI().flashError?.(pendingErrorFlash);
    }
  }

  /** @returns {string} */
  getPickerAccept() {
    return typeof this._opts.pickerAccept === 'string' && this._opts.pickerAccept.trim()
      ? this._opts.pickerAccept
      : '*/*';
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
    const credentials = this._resolveCredentials();

    const resp = await fetch(this._resolveEndpoint(file), {
      method: 'POST',
      body,
      headers,
      signal,
      ...(credentials ? { credentials } : {}),
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status} ${resp.statusText}`);

    const data = await resp.json();
    const urlField = this._opts.responseUrlField ?? 'url';
    if (typeof data?.[urlField] !== 'string') throw new Error(`Upload response missing "${urlField}" field`);
    return data[urlField];
  }

  _resolveCredentials() {
    const value = this._opts.credentials;
    if (value === 'omit' || value === 'same-origin' || value === 'include') {
      return value;
    }
    return null;
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

  /**
   * Resolve the upload endpoint URL for a given file.
   * Checks `opts.endpoints` pattern-map first (first matching key wins),
   * then falls back to `opts.endpoint`.
   * Returns `undefined` if neither is configured.
   *
   * @param {File} file
   * @returns {string|undefined}
   */
  _resolveEndpoint(file) {
    const map = this._opts.endpoints;
    if (map && typeof map === 'object') {
      for (const [pattern, url] of Object.entries(map)) {
        if (typeof url === 'string' && url.trim() && _matchesAllowedType(file, [pattern])) {
          return url.trim();
        }
      }
    }
    return typeof this._opts.endpoint === 'string' && this._opts.endpoint.trim()
      ? this._opts.endpoint.trim()
      : undefined;
  }

  _onPaste(event) {
    const items = event.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.kind === 'file') {
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
      this.handleFile(file);
    }
  }

  _insertMarkdown(file, url) {
    const api = this._getAPI();
    const sel = api.getSelection();
    const insertPos = sel.to;
    const payload = this._toMarkdownPayload(file, url);

    api.insertText(payload.markdown, insertPos);

    if (!payload.selection) return null;

    return {
      from: insertPos + payload.selection.from,
      to: insertPos + payload.selection.to,
    };
  }

  _toMarkdownPayload(file, url) {
    if (_isImageFile(file)) {
      const alt = _escapeMarkdownLabel(file.name || 'image');
      return {
        markdown: `![${alt}](${url})`,
        selection: { from: 2, to: 2 + alt.length },
      };
    }

    const label = _escapeMarkdownLabel(file.name || 'attachment');
    return {
      markdown: `[${label}](<${url}>)`,
      selection: { from: 1, to: 1 + label.length },
    };
  }
}

/**
 * Create a toolbar action for the file-picker upload button.
 * Must be called after AssetUploadHandler is instantiated so the handler ref is available.
 *
 * @param {AssetUploadHandler} handler
 * @returns {object}  Toolbar action definition
 */
export function createAssetUploadAction(handler) {
  return {
    id: 'asset-upload',
    title: 'Upload file (images and attachments)',
    group: 'insert',
    order: 42,
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/></svg>`,
    run() {
      const input = document.createElement('input');
      input.type    = 'file';
      input.accept  = handler.getPickerAccept();
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

function _isImageFile(file) {
  return typeof file?.type === 'string' && file.type.startsWith('image/');
}

function _matchesAllowedType(file, allowedList) {
  if (!Array.isArray(allowedList) || !allowedList.length) return true;

  const type = String(file?.type || '').toLowerCase();
  const fileName = String(file?.name || '').toLowerCase();

  return allowedList.some((rawRule) => {
    const rule = String(rawRule || '').trim().toLowerCase();
    if (!rule) return false;
    if (rule === '*' || rule === '*/*') return true;

    if (rule.startsWith('.')) {
      return fileName.endsWith(rule);
    }

    if (rule.endsWith('/*')) {
      const group = rule.slice(0, -1);
      return type.startsWith(group);
    }

    return type === rule;
  });
}

function _escapeMarkdownLabel(label) {
  return String(label)
    .replace(/\\/g, '\\\\')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]');
}
