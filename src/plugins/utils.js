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
  const hasSelection = sel.from !== sel.to;
  const text = hasSelection ? sel.text : placeholder;
  api.replaceSelection(`${marker}${text}${marker}`);

  if (!hasSelection) {
    const from = sel.from + marker.length;
    api.setSelection(from, from + text.length);
  }
}

/**
 * Prepend a prefix string to every selected line.
 * Preserves cursor position after the prepended prefix on the first affected line.
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
  const newMarkdown = updated.join('\n');
  api.setMarkdown(newMarkdown, { preservePreviewScroll: true });

  // Calculate cursor position: move it after the prefix on the first affected line
  const firstAffectedLine = lines[from];
  let cursorOffset = 0;
  for (let i = 0; i < from; i++) {
    cursorOffset += lines[i].length + 1; // +1 for newline
  }
  cursorOffset += prefix.length; // position after prefix on the first line
  api.setSelection(cursorOffset, cursorOffset);
}
