const BULLET_LIST_ITEM_RE = /^\s*[-+*]\s+/;
const ORDERED_LIST_ITEM_RE = /^\s*\d+[.)]\s+/;
const TASK_LIST_ITEM_RE = /^\s*[-+*]\s+\[[ xX]\]\s+/;
const TABLE_ROW_RE = /^\s*\|.+\|\s*$/;
const BLOCKQUOTE_RE = /^\s*>\s?/;
const HEADING_RE = /^\s{0,3}(#{1,6})\s+/;

const DEFAULT_ACTION_CONTEXTS = {
  undo: ['action:undo'],
  redo: ['action:redo'],
  bold: ['action:bold'],
  italic: ['action:italic'],
  strikethrough: ['action:strikethrough'],
  'inline-code': ['action:inline-code'],
  h1: ['action:h1'],
  h2: ['action:h2'],
  h3: ['action:h3'],
  blockquote: ['action:blockquote'],
  hr: ['action:hr'],
  'code-block': ['action:code-block'],
  ul: ['action:list', 'action:ul'],
  ol: ['action:list', 'action:ol'],
  'task-list': ['action:list', 'action:task-list'],
  image: ['action:image'],
  table: ['action:table'],
  mermaid: ['action:diagram', 'action:mermaid'],
  drawio: ['action:diagram', 'action:drawio'],
  link: ['action:link'],
};

/**
 * Maps editor interactions to hint context tags.
 */
export class HintContextDetector {
  /**
   * @param {object} [opts]
   * @param {Object.<string,string[]>} [opts.actionContexts]
   */
  constructor(opts = {}) {
    this._actionContexts = {
      ...DEFAULT_ACTION_CONTEXTS,
      ...(opts.actionContexts ?? {}),
    };
  }

  /**
   * @param {string} actionId
   * @returns {string[]}
   */
  contextFromAction(actionId) {
    const key = typeof actionId === 'string' ? actionId.trim() : '';
    if (!key) return [];
    return _normalizeTags(this._actionContexts[key] ?? []);
  }

  /**
   * @param {string} markdown
   * @param {{ lineFrom:number }} selection
   * @returns {string[]}
   */
  contextFromSelection(markdown, selection) {
    const lines = typeof markdown === 'string' ? markdown.split('\n') : [];
    const lineIndex = Number.isInteger(selection?.lineFrom) ? selection.lineFrom : -1;
    if (lineIndex < 0 || lineIndex >= lines.length) return [];

    const lineText = lines[lineIndex] ?? '';
    const tags = this.contextFromLineText(lineText);
    const cursorOffset = Number.isInteger(selection?.from) ? selection.from : null;

    if (cursorOffset === null) {
      return _normalizeTags(tags);
    }

    const lineStartOffset = _lineStartOffset(markdown, lineIndex);
    const column = Math.max(0, cursorOffset - lineStartOffset);

    if (_isCursorInsideStrong(lineText, column)) tags.push('edit:bold');
    if (_isCursorInsideEmphasis(lineText, column)) tags.push('edit:italic');
    if (_isCursorInsideInlineCode(lineText, column)) tags.push('edit:inline-code');

    const imageCtx = _detectImageContext(lineText, column);
    if (imageCtx.insideImage) tags.push('edit:image-markdown');
    if (imageCtx.insideAlt) tags.push('edit:image-alt');

    const linkCtx = _detectLinkContext(lineText, column);
    if (linkCtx.insideLink) tags.push('edit:link-markdown');
    if (linkCtx.insideLabel) tags.push('edit:link-label');
    if (linkCtx.insideUrl) tags.push('edit:link-url');

    if (_isCursorInsideFencedCode(lines, lineIndex)) {
      tags.push('edit:code-block');
    }

    return _normalizeTags(tags);
  }

  /**
   * @param {string} lineText
   * @returns {string[]}
   */
  contextFromLineText(lineText) {
    const text = typeof lineText === 'string' ? lineText : '';
    const tags = [];

    if (BULLET_LIST_ITEM_RE.test(text) || ORDERED_LIST_ITEM_RE.test(text)) {
      tags.push('edit:list-item');
    }
    if (TASK_LIST_ITEM_RE.test(text)) tags.push('edit:task-item');
    else if (ORDERED_LIST_ITEM_RE.test(text)) tags.push('edit:ol-item');
    else if (BULLET_LIST_ITEM_RE.test(text)) tags.push('edit:ul-item');
    if (TABLE_ROW_RE.test(text)) {
      tags.push('edit:table-row');
      tags.push('edit:table');
    }

    if (BLOCKQUOTE_RE.test(text)) {
      tags.push('edit:blockquote');
    }

    const headingMatch = text.match(HEADING_RE);
    if (headingMatch) {
      const level = headingMatch[1]?.length ?? 0;
      tags.push('edit:heading');
      if (level >= 1 && level <= 6) {
        tags.push(`edit:h${level}`);
      }
    }

    return _normalizeTags(tags);
  }

  /**
   * @param {object} payload
   * @param {'Tab'|'Shift-Tab'} payload.key
   * @param {string} payload.lineText
   * @returns {string[]}
   */
  contextFromKey(payload) {
    const tags = this.contextFromLineText(payload?.lineText ?? '');
    const key = typeof payload?.key === 'string' ? payload.key : '';
    const listType = _detectListType(payload?.lineText ?? '');

    if (key === 'Tab') tags.push('key:tab');
    if (key === 'Shift-Tab') tags.push('key:shift-tab');

    if ((key === 'Tab' || key === 'Shift-Tab') && listType) {
      tags.push(`key:list-indent-${listType}`);
    }

    return _normalizeTags(tags);
  }
}

function _detectListType(lineText) {
  const text = typeof lineText === 'string' ? lineText : '';
  if (TASK_LIST_ITEM_RE.test(text)) return 'task';
  if (ORDERED_LIST_ITEM_RE.test(text)) return 'ol';
  if (BULLET_LIST_ITEM_RE.test(text)) return 'ul';
  return '';
}

function _lineStartOffset(markdown, lineIndex) {
  const value = typeof markdown === 'string' ? markdown : '';
  if (lineIndex <= 0) return 0;

  let index = 0;
  let currentLine = 0;
  while (currentLine < lineIndex && index < value.length) {
    const nextBreak = value.indexOf('\n', index);
    if (nextBreak === -1) return value.length;
    index = nextBreak + 1;
    currentLine += 1;
  }
  return index;
}

function _isCursorInsideStrong(lineText, column) {
  return _isInsideDelimitedSpan(lineText, column, /\*\*[^\n]*?\*\*/g, 2, 2);
}

function _isCursorInsideEmphasis(lineText, column) {
  const text = typeof lineText === 'string' ? lineText : '';
  const spans = [];
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] !== '*') continue;
    if (text[i - 1] === '*' || text[i + 1] === '*') continue;
    const close = _findSingleStarClose(text, i + 1);
    if (close !== -1) {
      spans.push([i + 1, close]);
      i = close;
    }
  }
  return spans.some(([start, end]) => column >= start && column <= end);
}

function _findSingleStarClose(text, fromIndex) {
  for (let i = fromIndex; i < text.length; i += 1) {
    if (text[i] !== '*') continue;
    if (text[i - 1] === '*' || text[i + 1] === '*') continue;
    return i;
  }
  return -1;
}

function _isCursorInsideInlineCode(lineText, column) {
  return _isInsideDelimitedSpan(lineText, column, /`[^\n]*?`/g, 1, 1);
}

function _isInsideDelimitedSpan(lineText, column, regex, startTrim, endTrim) {
  const text = typeof lineText === 'string' ? lineText : '';
  const matches = text.matchAll(regex);

  for (const match of matches) {
    const raw = match[0] ?? '';
    const start = (match.index ?? 0) + startTrim;
    const end = (match.index ?? 0) + raw.length - endTrim;
    if (column >= start && column <= end) return true;
  }

  return false;
}

function _detectImageContext(lineText, column) {
  const text = typeof lineText === 'string' ? lineText : '';
  const regex = /!\[[^\]]*\]\([^\)]*\)/g;
  const matches = text.matchAll(regex);

  for (const match of matches) {
    const raw = match[0] ?? '';
    const start = match.index ?? 0;
    const end = start + raw.length;
    if (column < start || column > end) continue;

    const altStart = start + 2;
    const altEnd = raw.indexOf('](') === -1 ? altStart : start + raw.indexOf('](');

    return {
      insideImage: true,
      insideAlt: column >= altStart && column <= altEnd,
    };
  }

  return { insideImage: false, insideAlt: false };
}

function _detectLinkContext(lineText, column) {
  const text = typeof lineText === 'string' ? lineText : '';
  const regex = /(?<!!)\[[^\]]*\]\([^\)]*\)/g;
  const matches = text.matchAll(regex);

  for (const match of matches) {
    const raw = match[0] ?? '';
    const start = match.index ?? 0;
    const end = start + raw.length;
    if (column < start || column > end) continue;

    const bracketBoundary = raw.indexOf('](');
    const labelStart = start + 1;
    const labelEnd = bracketBoundary === -1 ? labelStart : start + bracketBoundary;
    const urlStart = bracketBoundary === -1 ? end : start + bracketBoundary + 2;
    const urlEnd = end - 1;

    return {
      insideLink: true,
      insideLabel: column >= labelStart && column <= labelEnd,
      insideUrl: column >= urlStart && column <= urlEnd,
    };
  }

  return { insideLink: false, insideLabel: false, insideUrl: false };
}

function _isCursorInsideFencedCode(lines, lineIndex) {
  if (!Array.isArray(lines) || !Number.isInteger(lineIndex) || lineIndex < 0) return false;

  let inFence = false;
  for (let i = 0; i <= lineIndex && i < lines.length; i += 1) {
    const line = String(lines[i] ?? '').trimStart();
    if (!line.startsWith('```')) continue;
    inFence = !inFence;
  }

  return inFence;
}

function _normalizeTags(tags) {
  if (!Array.isArray(tags)) return [];
  return [...new Set(
    tags
      .filter((entry) => typeof entry === 'string')
      .map((entry) => entry.trim())
      .filter(Boolean),
  )];
}
