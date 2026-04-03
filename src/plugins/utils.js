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

  let cursorOffset = 0;
  for (let i = 0; i < from; i++) {
    cursorOffset += lines[i].length + 1;
  }
  cursorOffset += prefix.length;
  api.setSelection(cursorOffset, cursorOffset);
}

/**
 * Prefix selected lines as a sequential ordered list.
 * Blank lines are preserved and do not increment numbering.
 *
 * @param {object} api
 * @returns {void}
 */
export function prependOrderedLines(api) {
  const sel = api.getSelection();
  const md = api.getMarkdown();
  const lines = md.split('\n');
  const from = sel.lineFrom;
  const to = sel.lineTo;
  let nextNumber = 1;

  const updated = lines.map((line, index) => {
    if (index < from || index > to) return line;
    if (!line.trim()) return line;

    const prefix = `${nextNumber}. `;
    nextNumber += 1;
    return `${prefix}${line}`;
  });

  const newMarkdown = updated.join('\n');
  api.setMarkdown(newMarkdown, { preservePreviewScroll: true });

  let cursorOffset = 0;
  for (let i = 0; i < from; i++) {
    cursorOffset += lines[i].length + 1;
  }
  cursorOffset += 3;
  api.setSelection(cursorOffset, cursorOffset);
}
