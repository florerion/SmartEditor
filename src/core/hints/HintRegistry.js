const DEFAULT_HINTS = [
  {
    id: 'undo-shortcut',
    text: 'Tip: Undo the last change with Ctrl+Z.',
    contexts: ['action:undo'],
    priority: 100,
  },
  {
    id: 'redo-shortcut',
    text: 'Tip: Redo reverted changes with Ctrl+Y.',
    contexts: ['action:redo'],
    priority: 100,
  },
  {
    id: 'bold-syntax',
    text: 'Tip: Use **text** for bold formatting.',
    contexts: ['action:bold', 'edit:bold'],
    priority: 100,
  },
  {
    id: 'italic-syntax',
    text: 'Tip: Use *text* for italic formatting.',
    contexts: ['action:italic', 'edit:italic'],
    priority: 100,
  },
  {
    id: 'strikethrough-syntax',
    text: 'Tip: Use ~~text~~ for strikethrough.',
    contexts: ['action:strikethrough'],
    priority: 100,
  },
  {
    id: 'inline-code-syntax',
    text: 'Tip: Use `code` for inline code snippets.',
    contexts: ['action:inline-code', 'edit:inline-code'],
    priority: 100,
  },
  {
    id: 'h1-syntax',
    text: 'Tip: Use # Heading for level-1 headings.',
    contexts: ['action:h1', 'edit:heading', 'edit:h1'],
    priority: 100,
  },
  {
    id: 'h2-syntax',
    text: 'Tip: Use ## Heading for level-2 headings.',
    contexts: ['action:h2', 'edit:heading', 'edit:h2'],
    priority: 100,
  },
  {
    id: 'h3-syntax',
    text: 'Tip: Use ### Heading for level-3 headings.',
    contexts: ['action:h3', 'edit:heading', 'edit:h3'],
    priority: 100,
  },
  {
    id: 'blockquote-syntax',
    text: 'Tip: Use > at the start of a line for blockquotes.',
    contexts: ['action:blockquote', 'edit:blockquote'],
    priority: 100,
  },
  {
    id: 'hr-syntax',
    text: 'Tip: Use --- on its own line to insert a horizontal rule.',
    contexts: ['action:hr'],
    priority: 100,
  },
  {
    id: 'code-block-syntax',
    text: 'Tip: Use fenced blocks with ```language and closing ``` for code blocks.',
    contexts: ['action:code-block', 'edit:code-block'],
    priority: 100,
  },
  {
    id: 'code-block-language-preview',
    text: 'Tip: In preview, change the language from the code block toolbar to update syntax highlighting.',
    contexts: ['action:code-block', 'edit:code-block'],
    priority: 90,
  },
  {
    id: 'code-block-copy-preview',
    text: 'Tip: Use the Copy button in a preview code block toolbar to copy the whole block.',
    contexts: ['action:code-block', 'edit:code-block'],
    priority: 90,
  },
  {
    id: 'ul-syntax',
    text: 'Tip: Start unordered list items with - item.',
    contexts: ['action:ul', 'action:list'],
    priority: 100,
  },
  {
    id: 'ol-syntax',
    text: 'Tip: Start ordered list items with 1. item.',
    contexts: ['action:ol', 'action:list'],
    priority: 100,
  },
  {
    id: 'task-list-syntax',
    text: 'Tip: Use - [ ] for open tasks and - [x] for completed tasks.',
    contexts: ['action:task-list', 'action:list'],
    priority: 100,
  },
  {
    id: 'ul-tab-indent',
    text: 'Tip: In list items, press Tab to indent and Shift+Tab to outdent.',
    contexts: ['action:list', 'action:ul', 'edit:list-item', 'key:tab', 'key:shift-tab'],
    priority: 20,
  },
  {
    id: 'ol-tab-indent',
    text: 'Tip: In ordered lists, Tab creates a nested level and Shift+Tab moves back.',
    contexts: ['action:list', 'action:ol', 'edit:list-item', 'key:tab', 'key:shift-tab'],
    priority: 20,
  },
  {
    id: 'task-list-tab-indent',
    text: 'Tip: In task lists, Tab/Shift+Tab changes nesting while keeping checkboxes intact.',
    contexts: ['action:list', 'action:task-list', 'edit:list-item', 'key:tab', 'key:shift-tab'],
    priority: 20,
  },
  {
    id: 'link-syntax',
    text: 'Tip: Use [label](https://example.com) to insert links.',
    contexts: ['action:link', 'edit:link-markdown', 'edit:link-label', 'edit:link-url'],
    priority: 100,
  },
  {
    id: 'link-mailto',
    text: 'Tip: For email links use [label](mailto:mail@address.com).',
    contexts: ['action:link', 'edit:link-markdown', 'edit:link-url'],
    priority: 95,
  },
  {
    id: 'image-syntax',
    text: 'Tip: Use ![alt text](https://image-url) to insert images.',
    contexts: ['action:image', 'edit:image-markdown', 'edit:image-alt'],
    priority: 100,
  },
  {
    id: 'image-preview-resize',
    text: 'Tip: Click an image in preview to resize it with drag handles.',
    contexts: ['action:image', 'edit:image-markdown', 'edit:image-alt'],
    priority: 85,
  },
  {
    id: 'image-preview-delete',
    text: 'Tip: Select an image in preview and press Delete/Backspace to remove its markdown token.',
    contexts: ['action:image', 'edit:image-markdown', 'edit:image-alt'],
    priority: 85,
  },
  {
    id: 'table-syntax',
    text: 'Tip: Markdown tables use pipes, e.g. | Col 1 | Col 2 |.',
    contexts: ['action:table', 'edit:table', 'edit:table-row'],
    priority: 100,
  },
  {
    id: 'table-cell-editing',
    text: 'Tip: Keep table rows aligned with | separators to avoid compatibility warnings.',
    contexts: ['action:table', 'edit:table', 'edit:table-row'],
    priority: 80,
  },
  {
    id: 'mermaid-syntax',
    text: 'Tip: Use ```mermaid blocks to render Mermaid diagrams in preview.',
    contexts: ['action:mermaid', 'action:diagram'],
    priority: 100,
  },
  {
    id: 'drawio-insert',
    text: 'Tip: Use the draw.io action to insert a diagram block into markdown.',
    contexts: ['action:drawio', 'action:diagram'],
    priority: 100,
  },
  {
    id: 'drawio-preview-edit',
    text: 'Tip: Click a draw.io diagram in preview to reopen and edit it.',
    contexts: ['action:drawio', 'action:diagram'],
    priority: 90,
  },
  {
    id: 'compatibility-mode',
    text: 'Tip: Compatibility mode validates markdown against your publishing profile.',
    contexts: ['fallback:general'],
    priority: 30,
  },
  {
    id: 'compatibility-fix-single',
    text: 'Tip: In the compatibility panel, use Fix to resolve one issue at a time.',
    contexts: ['fallback:general'],
    priority: 30,
  },
  {
    id: 'compatibility-fix-all',
    text: 'Tip: Use Fix all in compatibility panel to apply a batch normalization pass.',
    contexts: ['fallback:general'],
    priority: 30,
  },
  {
    id: 'compatibility-jump-to-line',
    text: 'Tip: Click a compatibility issue message to jump to its source line.',
    contexts: ['fallback:general'],
    priority: 30,
  },
  {
    id: 'split-mode-tip',
    text: 'Tip: Split mode lets you edit markdown and preview output side by side.',
    contexts: ['fallback:general'],
    priority: 20,
  },
  {
    id: 'theme-tip',
    text: 'Tip: Use the Theme dropdown in the toolbar to switch editor appearance quickly.',
    contexts: ['fallback:general'],
    priority: 25,
  },
];

/**
 * Mutable collection of hint definitions.
 */
export class HintRegistry {
  /**
   * @param {object[]} [hints]
   */
  constructor(hints = DEFAULT_HINTS) {
    this._hints = [];
    this.replaceAll(hints);
  }

  /** @returns {object[]} */
  getAll() {
    return this._hints.map((hint) => ({ ...hint, contexts: [...hint.contexts] }));
  }

  /**
   * @param {object[]} hints
   */
  replaceAll(hints) {
    if (!Array.isArray(hints)) {
      throw new Error('[HintRegistry] replaceAll expects an array of hint definitions.');
    }
    this._hints = hints.map((hint) => _normalizeHint(hint));
  }

  /**
   * @param {object} hint
   */
  registerHint(hint) {
    const normalized = _normalizeHint(hint);
    const existingIndex = this._hints.findIndex((entry) => entry.id === normalized.id);
    if (existingIndex !== -1) {
      this._hints[existingIndex] = normalized;
      return;
    }
    this._hints.push(normalized);
  }

  /**
   * @param {string} hintId
   */
  unregisterHint(hintId) {
    this._hints = this._hints.filter((hint) => hint.id !== hintId);
  }
}

function _normalizeHint(hint) {
  if (!hint || typeof hint !== 'object') {
    throw new Error('[HintRegistry] Hint must be an object.');
  }

  const id = typeof hint.id === 'string' ? hint.id.trim() : '';
  if (!id) {
    throw new Error('[HintRegistry] Hint requires a non-empty id.');
  }

  const text = typeof hint.text === 'string' ? hint.text.trim() : '';
  if (!text) {
    throw new Error(`[HintRegistry] Hint "${id}" requires non-empty text.`);
  }

  const contexts = Array.isArray(hint.contexts)
    ? hint.contexts
      .filter((entry) => typeof entry === 'string')
      .map((entry) => entry.trim())
      .filter(Boolean)
    : [];

  if (!contexts.length) {
    throw new Error(`[HintRegistry] Hint "${id}" requires at least one context tag.`);
  }

  return {
    id,
    text,
    contexts: [...new Set(contexts)],
    priority: Number.isFinite(hint.priority) ? hint.priority : 0,
  };
}
