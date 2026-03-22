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
   */
  codeLineToPreview(line, previewRoot) {
    const el = this.scrollPreviewToLine(line, previewRoot, { behavior: 'smooth' });
    if (el) this._highlight(el, previewRoot);
  }

  /**
   * Scroll preview to the closest element mapped to a source line.
   * @param {number} line
   * @param {HTMLElement} previewRoot
   * @param {object} [opts]
   * @param {'auto'|'smooth'} [opts.behavior='smooth']
   * @returns {HTMLElement|null}
   */
  scrollPreviewToLine(line, previewRoot, opts = {}) {
    if (!previewRoot || !Number.isFinite(line)) return null;
    const el = this._findClosestElement(line, previewRoot);
    if (!el) return null;

    const behavior = opts.behavior ?? 'smooth';
    const rootRect = previewRoot.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const top = previewRoot.scrollTop + (elRect.top - rootRect.top);
    previewRoot.scrollTo({ top: Math.max(0, top), behavior });
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
