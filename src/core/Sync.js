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
    if (!previewRoot) return;
    const el = this._findClosestElement(line, previewRoot);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      this._highlight(el, previewRoot);
    }
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
    root.querySelectorAll('.mde-sync-highlight')
      .forEach(e => e.classList.remove('mde-sync-highlight'));
    el.classList.add('mde-sync-highlight');
    clearTimeout(this._highlightTimer);
    this._highlightTimer = setTimeout(
      () => el.classList.remove('mde-sync-highlight'),
      1500,
    );
  }
}
