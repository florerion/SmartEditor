/**
 * Handles bidirectional synchronisation between the code editor and preview.
 *
 * Strategy:
 *  - code → preview:  given a 0-based line from CodeMirror, find the preview
 *    element whose data-source-line is closest (without exceeding), then
 *    scroll it into view and briefly highlight it.
 *  - preview → code:  given a clicked element, walk up to the nearest
 *    [data-source-line] ancestor and return the line range.
 */
export class Sync {
  constructor() {
    this._highlightTimer = null;
  }

  /**
   * Given a 0-based line number, scroll the closest preview element into view.
   * @param {number}      line        0-based line index from CodeMirror
   * @param {HTMLElement} previewRoot The preview panel root element
   * @param {object}      [opts]
   * @param {'auto'|'smooth'} [opts.behavior='smooth']
   * @param {number} [opts.targetViewportRatio=0.5] Desired vertical ratio (0..1)
   */
  codeLineToPreview(line, previewRoot, opts = {}) {
    const behavior = opts.behavior ?? 'smooth';
    const targetViewportRatio = Number.isFinite(opts.targetViewportRatio)
      ? opts.targetViewportRatio
      : 0.5;
    const el = this.scrollPreviewToLine(line, previewRoot, {
      behavior,
      targetViewportRatio,
    });
    if (el) this.highlightPreviewElement(el, previewRoot);
  }

  /**
   * Briefly highlight a preview element without changing scroll position.
   * @param {HTMLElement|null} el
   * @param {HTMLElement} previewRoot
   */
  highlightPreviewElement(el, previewRoot) {
    if (!el || !previewRoot) return;
    this._highlight(el, previewRoot);
  }

  /**
   * Scroll preview to the closest element mapped to a source line.
   * @param {number} line
   * @param {HTMLElement} previewRoot
   * @param {object} [opts]
   * @param {'auto'|'smooth'} [opts.behavior='smooth']
   * @param {number} [opts.targetViewportRatio=0.5] Desired vertical ratio (0..1)
  * @param {number} [opts.deadZoneRatio=0.04] Ignore tiny scroll deltas (0..1 of viewport)
  * @param {boolean} [opts.allowLargeBlockRatio=false] Keep ratio alignment even when the target block is taller than viewport
   * @returns {HTMLElement|null}
   */
  scrollPreviewToLine(line, previewRoot, opts = {}) {
    if (!previewRoot || !Number.isFinite(line)) return null;
    const el = this._findClosestElement(line, previewRoot);
    if (!el) return null;

    const behavior = opts.behavior ?? 'smooth';
    const rawRatio = Number.isFinite(opts.targetViewportRatio)
      ? opts.targetViewportRatio
      : 0.5;
    const ratio = Math.max(0, Math.min(1, rawRatio));
    const rawDeadZoneRatio = Number.isFinite(opts.deadZoneRatio)
      ? opts.deadZoneRatio
      : 0.04;
    const deadZoneRatio = Math.max(0, Math.min(1, rawDeadZoneRatio));
    const allowLargeBlockRatio = opts.allowLargeBlockRatio === true;
    const rootRect = previewRoot.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const viewportHeight = rootRect.height > 0 ? rootRect.height : (previewRoot.clientHeight || 1);
    // Large blocks should anchor at top; smaller blocks can preserve relative height.
    const effectiveRatio = elRect.height > viewportHeight && !allowLargeBlockRatio ? 0 : ratio;
    const top = previewRoot.scrollTop
      + (elRect.top - rootRect.top)
      - (effectiveRatio * viewportHeight);
    const targetTop = Math.max(0, top);
    const deadZonePx = Math.max(2, viewportHeight * deadZoneRatio);

    if (Math.abs(targetTop - previewRoot.scrollTop) <= deadZonePx) {
      return el;
    }

    previewRoot.scrollTo({ top: targetTop, behavior });
    return el;
  }

  /**
   * Get the 0-based source line of the first preview block intersecting the top edge.
   * @param {HTMLElement} previewRoot
   * @returns {number|null}
   */
  getTopPreviewLine(previewRoot) {
    if (!previewRoot) return null;
    const rootRect = previewRoot.getBoundingClientRect();
    const threshold = rootRect.top + 2;
    const candidates = Array.from(previewRoot.querySelectorAll('[data-source-line]'));
    if (!candidates.length) return null;

    let best = null;
    let bestDistance = Infinity;

    for (const el of candidates) {
      const rect = el.getBoundingClientRect();
      if (rect.bottom < rootRect.top || rect.top > rootRect.bottom) continue;

      const line = parseInt(el.getAttribute('data-source-line'), 10);
      if (!Number.isFinite(line)) continue;

      const distance = Math.abs(rect.top - threshold);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = line;
      }
    }

    if (best !== null) return best;
    const first = candidates[0];
    const line = parseInt(first.getAttribute('data-source-line'), 10);
    return Number.isFinite(line) ? line : null;
  }

  /**
   * Given a click target inside the preview, return the source line range.
   * @param {HTMLElement} target
   * @returns {{ from: number, to: number } | null}  0-based line numbers
   */
  previewElementToCodeRange(target) {
    const el = target.closest('[data-source-line]');
    if (!el) return null;
    const from = parseInt(el.getAttribute('data-source-line'), 10);
    const rawEnd = el.getAttribute('data-source-line-end');
    const to = rawEnd != null ? parseInt(rawEnd, 10) : from;
    return { from, to };
  }

  /**
   * Get the current viewport ratio (0..1) of the element mapped to `line`.
   * Uses the same closest-line selection semantics as scroll sync.
   * @param {number} line
   * @param {HTMLElement} previewRoot
   * @returns {{ line: number, viewportRatio: number } | null}
   */
  getPreviewViewportAnchorForLine(line, previewRoot) {
    if (!previewRoot || !Number.isFinite(line)) return null;
    const el = this._findClosestElement(line, previewRoot);
    if (!el) return null;

    const rootRect = previewRoot.getBoundingClientRect();
    if (rootRect.height <= 0) return null;

    const elRect = el.getBoundingClientRect();
    const mappedLine = parseInt(el.getAttribute('data-source-line') ?? '-1', 10);
    const viewportRatio = Math.max(0, Math.min(1, (elRect.top - rootRect.top) / rootRect.height));

    return {
      line: Number.isFinite(mappedLine) ? mappedLine : line,
      viewportRatio,
    };
  }

  /**
   * Capture the current pixel offset of the preview element mapped to `line`.
   * Useful for preserving the exact on-screen position across a re-render.
   * @param {number} line
   * @param {HTMLElement} previewRoot
   * @returns {{ line: number, offsetPx: number, viewportRatio: number } | null}
   */
  getPreviewPixelAnchorForLine(line, previewRoot) {
    if (!previewRoot || !Number.isFinite(line)) return null;
    const el = this._findClosestElement(line, previewRoot);
    if (!el) return null;

    const rootRect = previewRoot.getBoundingClientRect();
    if (rootRect.height <= 0) return null;

    const elRect = el.getBoundingClientRect();
    const mappedLine = parseInt(el.getAttribute('data-source-line') ?? '-1', 10);
    const offsetPx = elRect.top - rootRect.top;

    return {
      line: Number.isFinite(mappedLine) ? mappedLine : line,
      offsetPx,
      viewportRatio: Math.max(0, Math.min(1, offsetPx / rootRect.height)),
    };
  }

  // ------ private ------

  /** Find the element whose data-source-line is closest to (but ≤) `line`. */
  _findClosestElement(line, root) {
    const candidates = Array.from(root.querySelectorAll('[data-source-line]'));
    if (!candidates.length) return null;

    let best = null;
    let bestDelta = Infinity;

    for (const el of candidates) {
      const elLine = parseInt(el.getAttribute('data-source-line'), 10);
      const delta = line - elLine;
      if (delta >= 0 && delta < bestDelta) {
        bestDelta = delta;
        best = el;
      }
    }
    return best ?? candidates[0];
  }

  _highlight(el, root) {
    root.querySelectorAll('.se-sync-highlight')
      .forEach(e => e.classList.remove('se-sync-highlight'));
    el.classList.add('se-sync-highlight');
    clearTimeout(this._highlightTimer);
    this._highlightTimer = setTimeout(
      () => el.classList.remove('se-sync-highlight'),
      1500,
    );
  }
}
