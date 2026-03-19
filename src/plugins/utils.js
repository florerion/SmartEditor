/**
 * Shared helpers for toolbar plugin actions.
 */

/**
 * Wrap / unwrap the current selection with a symmetrical marker (e.g. ** or *).
 * If there is no selection, a placeholder is inserted wrapped in the marker.
 *
 * @param {object} api          Editor runtime API
 * @param {string} marker       e.g. '**', '*', '~~', '`'
 * @param {string} placeholder  Text used when nothing is selected
 */
export function wrapSelection(api, marker, placeholder = 'text') {
  const sel = api.getSelection();
  const text = sel.text || placeholder;
  api.replaceSelection(`${marker}${text}${marker}`);
}

/**
 * Prepend a prefix string to every selected line.
 * Works on the full document string for simplicity.
 *
 * @param {object} api
 * @param {string} prefix  e.g. '# ', '> ', '- '
 */
export function prependLines(api, prefix) {
  const sel = api.getSelection();
  const md = api.getMarkdown();
  const lines = md.split('\n');
  const from = sel.lineFrom;
  const to = sel.lineTo;

  const updated = lines.map((line, i) =>
    i >= from && i <= to ? `${prefix}${line}` : line,
  );
  api.setMarkdown(updated.join('\n'));
}
