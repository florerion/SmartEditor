/** @type {object} Toolbar action for inserting a Markdown table via a dialog */
export const tableAction = {
  id: 'table',
  title: 'Insert table',
  group: 'insert',
  order: 45,
  icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="1"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>`,
  run(api) {
    _showTableDialog(api);
  },
};

/** @type {object} Toolbar action for inserting a mermaid diagram template */
export const mermaidAction = {
  id: 'mermaid',
  title: 'Insert Mermaid diagram',
  group: 'insert',
  order: 46,
  icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="3" ry="2"/><ellipse cx="5" cy="19" rx="3" ry="2"/><ellipse cx="19" cy="19" rx="3" ry="2"/><line x1="12" y1="7" x2="8" y2="17"/><line x1="12" y1="7" x2="16" y2="17"/></svg>`,
  run(api) {
    api.insertText(
      '\n```mermaid\ngraph TD\n    A[Start] --> B{Decision}\n    B -->|Yes| C[OK]\n    B -->|No| D[Cancel]\n```\n',
    );
  },
};

// ---------------------------------------------------------------
// Internal dialog helpers
// ---------------------------------------------------------------

function _showTableDialog(api) {
  _removeExisting();

  const overlay = document.createElement('div');
  overlay.id = 'se-table-dialog';
  overlay.className = 'se-dialog-overlay';
  overlay.setAttribute('role', 'presentation');

  overlay.innerHTML = `
    <div class="se-dialog" role="dialog" aria-modal="true" aria-label="Insert table">
      <h3 class="se-dialog__title">Insert table</h3>
      <div class="se-dialog__body">
        <label class="se-dialog__label">
          Rows
          <input type="number" id="se-tbl-rows" value="3" min="1" max="50" class="se-dialog__input">
        </label>
        <label class="se-dialog__label">
          Columns
          <input type="number" id="se-tbl-cols" value="3" min="1" max="20" class="se-dialog__input">
        </label>
      </div>
      <div class="se-dialog__footer">
        <button class="se-dialog__btn se-dialog__btn--cancel" type="button">Cancel</button>
        <button class="se-dialog__btn se-dialog__btn--ok"     type="button">Insert</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const rowsInput = overlay.querySelector('#se-tbl-rows');
  const colsInput = overlay.querySelector('#se-tbl-cols');
  rowsInput.focus();
  rowsInput.select();

  const close = () => overlay.remove();

  overlay.querySelector('.se-dialog__btn--cancel').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  overlay.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });

  const doInsert = () => {
    const rows = Math.max(1, Math.min(50, parseInt(rowsInput.value, 10) || 3));
    const cols = Math.max(1, Math.min(20, parseInt(colsInput.value, 10) || 3));
    close();
    const tableMarkdown = _generateTable(rows, cols);
    const textToInsert = '\n' + tableMarkdown + '\n';
    const sel = api.getSelection();
    const insertPos = sel.to;

    api.insertText(textToInsert);

    const headerPlaceholder = 'Col 1';
    const headerStart = insertPos + textToInsert.indexOf(headerPlaceholder);
    api.setSelection(headerStart, headerStart + headerPlaceholder.length);
  };

  overlay.querySelector('.se-dialog__btn--ok').addEventListener('click', doInsert);
  overlay.addEventListener('keydown', (e) => { if (e.key === 'Enter') doInsert(); });
}

function _removeExisting() {
  document.getElementById('se-table-dialog')?.remove();
}

/**
 * Generate a Markdown table string.
 * @param {number} rows  Data rows (excluding header)
 * @param {number} cols
 * @returns {string}
 */
function _generateTable(rows, cols) {
  const header    = Array.from({ length: cols }, (_, i) => ` Col ${i + 1} `).join('|');
  const separator = Array.from({ length: cols }, () => ' --- ').join('|');
  const dataRow   = Array.from({ length: cols }, () => '  ').join('|');

  const lines = [`|${header}|`, `|${separator}|`];
  for (let r = 0; r < rows; r++) lines.push(`|${dataRow}|`);
  return lines.join('\n');
}
