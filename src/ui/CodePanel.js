import { Compartment, EditorState, RangeSetBuilder, Transaction } from '@codemirror/state';
import {
  Decoration,
  EditorView,
  ViewPlugin,
  WidgetType,
  keymap,
  highlightSpecialChars,
  drawSelection,
  dropCursor,
  rectangularSelection,
  highlightActiveLine,
  highlightActiveLineGutter,
  lineNumbers,
} from '@codemirror/view';
import {
  defaultKeymap,
  historyKeymap,
  history,
  indentWithTab,
  undo as cmUndo,
  redo as cmRedo,
} from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';
import {
  defaultHighlightStyle,
  syntaxHighlighting,
  bracketMatching,
  indentOnInput,
} from '@codemirror/language';

const COLLAPSE_MIN_LENGTH = 140;
const COLLAPSE_HEAD = 5;
const COLLAPSE_TAIL = 5;
const ORDERED_LIST_INDENT = '    ';
const BULLET_LIST_INDENT = '  ';
const ORDERED_LIST_ITEM_RE = /^(\s*)(\d+)([.)])\s+(.*)$/;
const BULLET_LIST_ITEM_RE = /^(\s*)([-+*])\s+(.*)$/;
const LIST_LIKE_LINE_RE = /^\s*(?:\d+[.)]|[-+*])\s+/;

class CollapseWidget extends WidgetType {
  toDOM() {
    const span = document.createElement('span');
    span.className = 'cm-se-collapse-widget';
    span.textContent = '[...]';
    span.title = 'Long payload visually collapsed';
    return span;
  }
}

const collapseDecoration = Decoration.replace({
  widget: new CollapseWidget(),
  inclusive: false,
});

const longPayloadCollapsePlugin = ViewPlugin.fromClass(class {
  constructor(view) {
    this.decorations = buildCollapseDecorations(view);
  }

  update(update) {
    if (update.docChanged || update.viewportChanged) {
      this.decorations = buildCollapseDecorations(update.view);
    }
  }
}, {
  decorations: plugin => plugin.decorations,
});

/**
 * markdown-it recognizes nested ordered sublists when the indented marker
 * starts from `1.` (or `1)`), so Tab on ordered-list lines rewrites marker.
 * @param {EditorView} view
 * @returns {boolean}
 */
function indentOrderedListItemWithTab(view) {
  const selection = view.state.selection.main;
  const doc = view.state.doc;
  const target = _getOrderedListSelectionTarget(doc, selection);
  if (!target) return false;
  const lines = doc.toString().split('\n');

  if (!selection.empty && target.containsMixedListTypes) {
    for (let index = target.startLineIndex; index <= target.endLineIndex; index++) {
      const lineText = lines[index];
      const orderedMatch = lineText.match(ORDERED_LIST_ITEM_RE);
      if (orderedMatch) {
        const [, leading, , marker, rest] = orderedMatch;
        lines[index] = `${leading}${ORDERED_LIST_INDENT}1${marker} ${rest}`;
        continue;
      }

      const bulletMatch = lineText.match(BULLET_LIST_ITEM_RE);
      if (bulletMatch) {
        const [, leading, marker, rest] = bulletMatch;
        lines[index] = `${leading}${BULLET_LIST_INDENT}${marker} ${rest}`;
      }
    }

    const update = _buildMixedListSelectionUpdate(doc, lines, target);

    view.dispatch({
      changes: {
        from: update.blockFrom,
        to: update.blockTo,
        insert: update.blockText,
      },
      selection: {
        anchor: update.selectionAnchor,
        head: update.selectionHead,
      },
    });
    return true;
  }

  let nextCursorCol = 0;

  for (let index = target.startLineIndex; index <= target.endLineIndex; index++) {
    const match = lines[index].match(ORDERED_LIST_ITEM_RE);
    if (!match) return false;

    const [, leading, digits, marker, rest] = match;
    if (selection.empty && index === target.focusLineIndex) {
      const markerStart = leading.length;
      const markerEnd = markerStart + digits.length + 1;
      nextCursorCol = target.focusColumn + ORDERED_LIST_INDENT.length;

      if (target.focusColumn > markerStart && target.focusColumn <= markerEnd) {
        nextCursorCol = leading.length + ORDERED_LIST_INDENT.length + 1 + (target.focusColumn - markerStart - 1);
      } else if (target.focusColumn > markerEnd) {
        nextCursorCol = target.focusColumn + (ORDERED_LIST_INDENT.length - digits.length + 1);
      }
    }

    lines[index] = `${leading}${ORDERED_LIST_INDENT}1${marker} ${rest}`;
  }

  const update = _buildOrderedListBlockUpdate(doc, lines, target, {
    mode: selection.empty ? 'cursor' : 'range',
    cursorCol: nextCursorCol,
  });

  view.dispatch({
    changes: {
      from: update.blockFrom,
      to: update.blockTo,
      insert: update.blockText,
    },
    selection: {
      anchor: update.selectionAnchor,
      head: update.selectionHead,
    },
  });
  return true;
}

/**
 * Ordered sublists add four spaces, so Shift-Tab removes the same amount and
 * reflows numbering for following siblings.
 * @param {EditorView} view
 * @returns {boolean}
 */
function outdentOrderedListItemWithShiftTab(view) {
  const selection = view.state.selection.main;
  const doc = view.state.doc;
  const target = _getOrderedListSelectionTarget(doc, selection);
  if (!target) return false;
  const lines = doc.toString().split('\n');

  if (!selection.empty && target.containsMixedListTypes) {
    let changed = false;

    for (let index = target.startLineIndex; index <= target.endLineIndex; index++) {
      const lineText = lines[index];
      const orderedMatch = lineText.match(ORDERED_LIST_ITEM_RE);
      if (orderedMatch) {
        const [, leading, digits, marker, rest] = orderedMatch;
        const removablePrefix = _extractOrderedListOutdentPrefix(leading);
        if (!removablePrefix) continue;
        changed = true;
        const nextLeading = leading.slice(0, leading.length - removablePrefix.length);
        lines[index] = `${nextLeading}${digits}${marker} ${rest}`;
        continue;
      }

      const bulletMatch = lineText.match(BULLET_LIST_ITEM_RE);
      if (!bulletMatch) continue;

      const [, leading, marker, rest] = bulletMatch;
      const removablePrefix = _extractBulletListOutdentPrefix(leading);
      if (!removablePrefix) continue;
      changed = true;
      const nextLeading = leading.slice(0, leading.length - removablePrefix.length);
      lines[index] = `${nextLeading}${marker} ${rest}`;
    }

    if (!changed) return true;

    const update = _buildMixedListSelectionUpdate(doc, lines, target);

    view.dispatch({
      changes: {
        from: update.blockFrom,
        to: update.blockTo,
        insert: update.blockText,
      },
      selection: {
        anchor: update.selectionAnchor,
        head: update.selectionHead,
      },
    });
    return true;
  }

  let nextCursorCol = 0;
  let changed = false;

  for (let index = target.startLineIndex; index <= target.endLineIndex; index++) {
    const match = lines[index].match(ORDERED_LIST_ITEM_RE);
    if (!match) return false;

    const [, leading, digits, marker, rest] = match;
    const removablePrefix = _extractOrderedListOutdentPrefix(leading);
    if (!removablePrefix) continue;

    changed = true;
    const nextLeading = leading.slice(0, leading.length - removablePrefix.length);
    if (selection.empty && index === target.focusLineIndex) {
      nextCursorCol = Math.max(0, target.focusColumn - removablePrefix.length);
      const markerStart = leading.length;
      const markerEnd = markerStart + digits.length + 1;

      if (target.focusColumn > markerStart && target.focusColumn <= markerEnd) {
        nextCursorCol = nextLeading.length + 1 + (target.focusColumn - markerStart - 1);
      } else if (target.focusColumn > markerEnd) {
        nextCursorCol = Math.max(0, target.focusColumn - removablePrefix.length);
      }
    }

    lines[index] = `${nextLeading}${digits}${marker} ${rest}`;
  }

  if (!changed) return true;

  const update = _buildOrderedListBlockUpdate(doc, lines, target, {
    mode: selection.empty ? 'cursor' : 'range',
    cursorCol: nextCursorCol,
  });

  view.dispatch({
    changes: {
      from: update.blockFrom,
      to: update.blockTo,
      insert: update.blockText,
    },
    selection: {
      anchor: update.selectionAnchor,
      head: update.selectionHead,
    },
  });
  return true;
}

function _buildOrderedListBlockUpdate(doc, lines, target, selectionState) {
  const [blockStart, blockEnd] = _getListBlockBounds(lines, target.startLineIndex);
  const counters = [];

  for (let index = blockStart; index < target.startLineIndex; index++) {
    _consumeListLineForOrderedCounters(lines[index], counters);
  }

  for (let index = target.startLineIndex; index <= blockEnd; index++) {
    const itemMatch = lines[index].match(ORDERED_LIST_ITEM_RE);
    if (!itemMatch) {
      _consumeListLineForOrderedCounters(lines[index], counters);
      continue;
    }

    const [, itemLeading, , itemMarker, itemRest] = itemMatch;
    const nextNumber = _nextOrderedListNumber(counters, _indentWidth(itemLeading));
    lines[index] = `${itemLeading}${nextNumber}${itemMarker} ${itemRest}`;
  }

  const blockLines = lines.slice(blockStart, blockEnd + 1);
  const blockText = blockLines.join('\n');
  const blockFrom = doc.line(blockStart + 1).from;
  const blockTo = doc.line(blockEnd + 1).to;

  if (selectionState.mode === 'range') {
    const startOffset = _lineOffsetWithinBlock(blockLines, target.startLineIndex - blockStart);
    const endOffset = _lineOffsetWithinBlock(blockLines, target.endLineIndex - blockStart);
    const endLineLength = blockLines[target.endLineIndex - blockStart]?.length ?? 0;

    return {
      blockFrom,
      blockTo,
      blockText,
      selectionAnchor: blockFrom + startOffset,
      selectionHead: blockFrom + endOffset + endLineLength,
    };
  }

  const focusIndexInBlock = target.focusLineIndex - blockStart;
  const finalCurrentLine = blockLines[focusIndexInBlock] ?? '';
  const finalCursorCol = Math.max(0, Math.min(selectionState.cursorCol, finalCurrentLine.length));
  const currentLineOffset = _lineOffsetWithinBlock(blockLines, focusIndexInBlock);

  return {
    blockFrom,
    blockTo,
    blockText,
    selectionAnchor: blockFrom + currentLineOffset + finalCursorCol,
    selectionHead: blockFrom + currentLineOffset + finalCursorCol,
  };
}

function _buildMixedListSelectionUpdate(doc, lines, target) {
  const normalizedRanges = _renumberOrderedListBlocks(lines, target.orderedLineIndexes ?? []);
  let replaceStart = target.startLineIndex;
  let replaceEnd = target.endLineIndex;

  normalizedRanges.forEach(([start, end]) => {
    replaceStart = Math.min(replaceStart, start);
    replaceEnd = Math.max(replaceEnd, end);
  });

  const replaceLines = lines.slice(replaceStart, replaceEnd + 1);
  const replaceText = replaceLines.join('\n');
  const replaceFrom = doc.line(replaceStart + 1).from;
  const replaceTo = doc.line(replaceEnd + 1).to;
  const selectionStartOffset = _lineOffsetWithinBlock(replaceLines, target.startLineIndex - replaceStart);
  const selectionEndOffset = _lineOffsetWithinBlock(replaceLines, target.endLineIndex - replaceStart);
  const selectionEndLength = replaceLines[target.endLineIndex - replaceStart]?.length ?? 0;

  return {
    blockFrom: replaceFrom,
    blockTo: replaceTo,
    blockText: replaceText,
    selectionAnchor: replaceFrom + selectionStartOffset,
    selectionHead: replaceFrom + selectionEndOffset + selectionEndLength,
  };
}

function _getOrderedListSelectionTarget(doc, selection) {
  const focusPos = selection.head;
  const focusLine = doc.lineAt(focusPos);
  const focusKind = _getListLineKind(focusLine.text);
  if (selection.empty && focusKind !== 'ordered') return null;

  const focusLineIndex = focusLine.number - 1;
  const focusColumn = focusPos - focusLine.from;

  if (selection.empty) {
    return {
      startLineIndex: focusLineIndex,
      endLineIndex: focusLineIndex,
      focusLineIndex,
      focusColumn,
    };
  }

  const startLineIndex = doc.lineAt(Math.min(selection.from, selection.to)).number - 1;
  const endLookupPos = Math.max(selection.from, selection.to) - 1;
  const endLineIndex = doc.lineAt(Math.max(selection.from, endLookupPos)).number - 1;
  let containsMixedListTypes = false;
  const orderedLineIndexes = [];

  for (let index = startLineIndex; index <= endLineIndex; index++) {
    const lineText = doc.line(index + 1).text;
    const kind = _getListLineKind(lineText);
    if (!kind) {
      if (_isBlankLine(lineText)) {
        containsMixedListTypes = true;
        continue;
      }
      return null;
    }
    if (kind === 'ordered') {
      orderedLineIndexes.push(index);
    } else {
      containsMixedListTypes = true;
    }
  }

  if (!orderedLineIndexes.length) return null;

  return {
    startLineIndex,
    endLineIndex,
    focusLineIndex,
    focusColumn,
    containsMixedListTypes,
    orderedLineIndexes,
  };
}

function _renumberOrderedListBlocks(lines, orderedLineIndexes) {
  const mergedRanges = [];

  orderedLineIndexes
    .map(index => _getListBlockBounds(lines, index))
    .sort((a, b) => a[0] - b[0])
    .forEach(([start, end]) => {
      const lastRange = mergedRanges[mergedRanges.length - 1];
      if (lastRange && start <= lastRange[1] + 1) {
        lastRange[1] = Math.max(lastRange[1], end);
        return;
      }
      mergedRanges.push([start, end]);
    });

  mergedRanges.forEach(([start, end]) => {
    const counters = [];
    for (let index = start; index <= end; index++) {
      const itemMatch = lines[index].match(ORDERED_LIST_ITEM_RE);
      if (!itemMatch) {
        _consumeListLineForOrderedCounters(lines[index], counters);
        continue;
      }

      const [, itemLeading, , itemMarker, itemRest] = itemMatch;
      const nextNumber = _nextOrderedListNumber(counters, _indentWidth(itemLeading));
      lines[index] = `${itemLeading}${nextNumber}${itemMarker} ${itemRest}`;
    }
  });

  return mergedRanges;
}

function _lineOffsetWithinBlock(blockLines, indexInBlock) {
  let offset = 0;
  for (let index = 0; index < indexInBlock; index++) {
    offset += blockLines[index].length + 1;
  }
  return offset;
}

function _consumeListLineForOrderedCounters(lineText, counters) {
  const orderedMatch = lineText.match(ORDERED_LIST_ITEM_RE);
  if (orderedMatch) {
    _nextOrderedListNumber(counters, _indentWidth(orderedMatch[1]));
    return;
  }

  if (!LIST_LIKE_LINE_RE.test(lineText)) return;
  const indent = _indentWidth((lineText.match(/^(\s*)/) ?? ['', ''])[1]);
  while (counters.length && counters[counters.length - 1].indent > indent) {
    counters.pop();
  }
}

function _nextOrderedListNumber(counters, indent) {
  while (counters.length && counters[counters.length - 1].indent > indent) {
    counters.pop();
  }

  const top = counters[counters.length - 1];
  if (top && top.indent === indent) {
    const next = top.next;
    top.next += 1;
    return next;
  }

  counters.push({ indent, next: 2 });
  return 1;
}

function _getListBlockBounds(lines, centerIndex) {
  let start = centerIndex;
  let end = centerIndex;

  while (start > 0 && LIST_LIKE_LINE_RE.test(lines[start - 1])) {
    start -= 1;
  }
  while (end < lines.length - 1 && LIST_LIKE_LINE_RE.test(lines[end + 1])) {
    end += 1;
  }

  return [start, end];
}

function _indentWidth(leadingWhitespace) {
  let width = 0;
  for (const ch of leadingWhitespace) {
    width += ch === '\t' ? 4 : 1;
  }
  return width;
}

function _extractOrderedListOutdentPrefix(leadingWhitespace) {
  if (!leadingWhitespace) return '';
  if (leadingWhitespace.endsWith(ORDERED_LIST_INDENT)) return ORDERED_LIST_INDENT;
  if (leadingWhitespace.endsWith('\t')) return '\t';
  return '';
}

function _extractBulletListOutdentPrefix(leadingWhitespace) {
  if (!leadingWhitespace) return '';
  if (leadingWhitespace.endsWith(BULLET_LIST_INDENT)) return BULLET_LIST_INDENT;
  if (leadingWhitespace.endsWith('\t')) return '\t';
  return '';
}

function _getListLineKind(lineText) {
  if (ORDERED_LIST_ITEM_RE.test(lineText)) return 'ordered';
  if (BULLET_LIST_ITEM_RE.test(lineText)) return 'bullet';
  return null;
}

function _isBlankLine(lineText) {
  return lineText.trim().length === 0;
}

function buildCollapseDecorations(view) {
  const builder = new RangeSetBuilder();
  for (const range of view.visibleRanges) {
    let line = view.state.doc.lineAt(range.from);
    while (line.from <= range.to) {
      addCollapsedRangesForLine(line, builder);
      if (line.number >= view.state.doc.lines) break;
      line = view.state.doc.line(line.number + 1);
    }
  }
  return builder.finish();
}

function addCollapsedRangesForLine(line, builder) {
  const collapsedRanges = [
    ...findBase64Ranges(line),
    ...findDrawioXmlRanges(line),
  ].sort((a, b) => a.from - b.from);

  for (const range of collapsedRanges) {
    if (range.to > range.from) {
      builder.add(range.from, range.to, collapseDecoration);
    }
  }
}

function findBase64Ranges(line) {
  const result = [];
  const text = line.text;
  const imageRegex = /!\[[^\]]*\]\(([^)\r\n]+)\)/g;
  let match;

  while ((match = imageRegex.exec(text)) !== null) {
    const src = match[1];
    const markerIndex = src.indexOf(';base64,');
    if (markerIndex < 0) continue;

    const payloadStart = markerIndex + ';base64,'.length;
    const payloadLength = src.length - payloadStart;
    if (payloadLength <= COLLAPSE_MIN_LENGTH) continue;

    const groupStart = match.index + match[0].indexOf('(') + 1;
    const collapseFrom = line.from + groupStart + payloadStart + COLLAPSE_HEAD;
    const collapseTo = line.from + groupStart + src.length - COLLAPSE_TAIL;
    if (collapseTo > collapseFrom) {
      result.push({ from: collapseFrom, to: collapseTo });
    }
  }

  return result;
}

function findDrawioXmlRanges(line) {
  const result = [];
  const text = line.text;
  const drawioRegex = /!\[draw\.io\]\([^)\r\n]+\)\{([^}]*)\}/g;
  let match;

  while ((match = drawioRegex.exec(text)) !== null) {
    const xml = match[1];
    if (xml.length <= COLLAPSE_MIN_LENGTH) continue;

    const xmlStartInMatch = match[0].lastIndexOf('{') + 1;
    const collapseFrom = line.from + match.index + xmlStartInMatch + COLLAPSE_HEAD;
    const collapseTo = line.from + match.index + xmlStartInMatch + xml.length - COLLAPSE_TAIL;
    if (collapseTo > collapseFrom) {
      result.push({ from: collapseFrom, to: collapseTo });
    }
  }

  return result;
}

/**
 * Thin wrapper around CodeMirror 6 exposing only the API needed by EditorCore.
 */
export class CodePanel {
  /**
   * @param {HTMLElement} container
   * @param {object} opts
   * @param {string}   opts.value
   * @param {Function} opts.onChange         (value: string) => void
   * @param {Function} opts.onCursorMove     (line: number) => void  — 0-based
   * @param {Function} opts.onSelectionChange (selInfo: object) => void
   * @param {Function} opts.onScroll         (topLine: number) => void  — 0-based
   * @param {Function} [opts.onHintKey]      (payload: object) => void
   */
  constructor(container, opts) {
    this._container = container;
    this._onChange = opts.onChange ?? (() => {});
    this._onCursorMove = opts.onCursorMove ?? (() => {});
    this._onSelectionChange = opts.onSelectionChange ?? (() => {});
    this._onScroll = opts.onScroll ?? (() => {});
    this._onHintKey = opts.onHintKey ?? (() => {});
    this._suppressUpdate = false;
    this._editableCompartment = new Compartment();
    this._editable = true;

    this._view = new EditorView({
      state: this._buildState(opts.value ?? ''),
      parent: container,
    });

    this._scroller = this._view.scrollDOM;
    this._boundScroll = this._handleScroll.bind(this);
    this._scroller.addEventListener('scroll', this._boundScroll, { passive: true });
  }

  // ------ public API ------

  /** @returns {string} */
  getValue() {
    return this._view.state.doc.toString();
  }

  /**
   * @param {string}  value
   * @param {boolean} [undoable=true]
   */
  setValue(value, undoable = true) {
    if (value === this.getValue()) return;
    this._suppressUpdate = true;
    const transaction = {
      changes: { from: 0, to: this._view.state.doc.length, insert: value },
    };

    if (!undoable) {
      transaction.annotations = Transaction.addToHistory.of(false);
    }

    this._view.dispatch(transaction);
    this._suppressUpdate = false;
  }

  /**
   * @returns {{ from: number, to: number, text: string, lineFrom: number, lineTo: number }}
   */
  getSelection() {
    const state = this._view.state;
    const sel = state.selection.main;
    const text = state.sliceDoc(sel.from, sel.to);
    const lineFrom = state.doc.lineAt(sel.from).number - 1; // convert to 0-based
    const lineTo = state.doc.lineAt(sel.to).number - 1;
    return { from: sel.from, to: sel.to, text, lineFrom, lineTo };
  }

  /**
   * @param {number} from  character offset
   * @param {number} to    character offset
   */
  setSelection(from, to) {
    this._view.dispatch({ selection: { anchor: from, head: to } });
    this._view.focus();
  }

  /**
   * Insert text at cursor (or at explicit character offset).
   * Does NOT replace any selection — use replaceSelection for that.
   * @param {string}      text
   * @param {number|null} [position]  character offset; null means cursor position
   */
  insertText(text, position = null) {
    const state = this._view.state;
    const from = position !== null ? position : state.selection.main.head;
    this._view.dispatch({
      changes: { from, to: from, insert: text },
      selection: { anchor: from + text.length },
    });
    this._view.focus();
  }

  /**
   * Replace the current selection with text.
   * @param {string} text
   */
  replaceSelection(text) {
    const sel = this._view.state.selection.main;
    this._view.dispatch({
      changes: { from: sel.from, to: sel.to, insert: text },
      selection: { anchor: sel.from + text.length },
    });
    this._view.focus();
  }

  /**
   * Replace a document range without forcing cursor movement.
   * Useful for programmatic edits that should not re-center the viewport.
   * @param {number} from
   * @param {number} to
   * @param {string} text
   * @param {object} [opts]
   * @param {boolean} [opts.focus=false]
   */
  replaceRange(from, to, text, opts = {}) {
    this._view.dispatch({
      changes: { from, to, insert: text },
    });
    if (opts.focus === true) {
      this._view.focus();
    }
  }

  /**
   * Reveal a document position without overwriting the current selection.
   * @param {number} position
   * @param {object} [opts]
   * @param {'start'|'center'|'end'|'nearest'} [opts.y='center']
   */
  revealPosition(position, opts = {}) {
    const docLength = this._view.state.doc.length;
    const target = Math.max(0, Math.min(Number(position) || 0, docLength));
    this._view.dispatch({
      effects: EditorView.scrollIntoView(target, { y: opts.y ?? 'center' }),
    });
    this._view.focus();
  }

  /**
   * Scroll to and select a 0-based line.
   * @param {number} line
   */
  scrollToLine(line) {
    const state = this._view.state;
    const cmLine = Math.min(line + 1, state.doc.lines); // CodeMirror lines are 1-based
    const lineObj = state.doc.line(cmLine);
    this._view.dispatch({
      selection: { anchor: lineObj.from },
      effects: EditorView.scrollIntoView(lineObj.from, { y: 'center' }),
    });
    this._view.focus();
  }

  /**
   * Scroll to and select a 0-based line while preserving relative viewport height.
   * @param {number} line
   * @param {number} viewportRatio  Desired line position in viewport (0..1)
   * @param {object} [opts]
   * @param {'auto'|'smooth'} [opts.behavior='auto']
    * @param {number} [opts.deadZoneRatio=0.04] Ignore tiny scroll deltas (0..1 of viewport)
   */
  scrollToLineAtRatio(line, viewportRatio, opts = {}) {
    const state = this._view.state;
    const cmLine = Math.max(1, Math.min(line + 1, state.doc.lines));
    const lineObj = state.doc.line(cmLine);
    const ratio = Number.isFinite(viewportRatio)
      ? Math.max(0, Math.min(1, viewportRatio))
      : 0.5;
    const rawDeadZoneRatio = Number.isFinite(opts.deadZoneRatio)
      ? opts.deadZoneRatio
      : 0.04;
    const deadZoneRatio = Math.max(0, Math.min(1, rawDeadZoneRatio));

    this._view.dispatch({ selection: { anchor: lineObj.from } });

    const blockTop = this._view.lineBlockAt(lineObj.from).top;
    const viewportHeight = this._scroller.clientHeight || 1;
    const targetTop = Math.max(0, blockTop - (ratio * viewportHeight));
    const deadZonePx = Math.max(2, viewportHeight * deadZoneRatio);
    if (Math.abs(targetTop - this._scroller.scrollTop) > deadZonePx) {
      this._scroller.scrollTo({ top: targetTop, behavior: opts.behavior ?? 'auto' });
    }
    this._view.focus();
  }

  /** @returns {number} 0-based current cursor line */
  getCursorLine() {
    const state = this._view.state;
    return state.doc.lineAt(state.selection.main.head).number - 1;
  }

  /**
   * Get current cursor vertical position as viewport ratio (0..1).
   * Returns 0.5 if coordinates are not available.
   * @returns {number}
   */
  getCursorViewportRatio() {
    const head = this._view.state.selection.main.head;
    const coords = this._view.coordsAtPos(head);
    const rect = this._scroller.getBoundingClientRect();
    if (!coords || rect.height <= 0) return 0.5;
    return Math.max(0, Math.min(1, (coords.top - rect.top) / rect.height));
  }

  /** @returns {number} 0-based line near the top of the visible editor viewport */
  getTopVisibleLine() {
    const scrollTop = this._scroller.scrollTop;
    try {
      const block = this._view.lineBlockAtHeight(scrollTop);
      return this._view.state.doc.lineAt(block.from).number - 1;
    } catch {
      return 0;
    }
  }

  /**
   * Scroll viewport to a 0-based line without changing selection.
   * @param {number} line
   * @param {object} [opts]
   * @param {'auto'|'smooth'} [opts.behavior='auto']
   */
  scrollViewportToLine(line, opts = {}) {
    const state = this._view.state;
    const cmLine = Math.max(1, Math.min(line + 1, state.doc.lines));
    const pos = state.doc.line(cmLine).from;
    const top = this._view.lineBlockAt(pos).top;
    this._scroller.scrollTo({ top, behavior: opts.behavior ?? 'auto' });
  }

  undo() { cmUndo(this._view); }
  redo() { cmRedo(this._view); }

  focus() { this._view.focus(); }

  /**
   * Toggle user editing capabilities without replacing editor content.
   * @param {boolean} editable
   */
  setEditable(editable) {
    const nextEditable = editable !== false;
    if (nextEditable === this._editable) return;

    this._editable = nextEditable;
    this._view.dispatch({
      effects: this._editableCompartment.reconfigure(EditorView.editable.of(nextEditable)),
    });
  }

  destroy() {
    this._scroller?.removeEventListener('scroll', this._boundScroll);
    this._view.destroy();
  }

  // ------ private ------

  _buildState(value) {
    return EditorState.create({
      doc: value,
      extensions: [
        this._editableCompartment.of(EditorView.editable.of(this._editable)),
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightSpecialChars(),
        history(),
        drawSelection(),
        dropCursor(),
        indentOnInput(),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        bracketMatching(),
        rectangularSelection(),
        highlightActiveLine(),
        markdown(),
        keymap.of([
          {
            key: 'Tab',
            run: (view) => {
              const handled = indentOrderedListItemWithTab(view);
              this._emitHintKeyEvent(view, 'Tab', handled);
              return handled;
            },
          },
          {
            key: 'Shift-Tab',
            run: (view) => {
              const handled = outdentOrderedListItemWithShiftTab(view);
              this._emitHintKeyEvent(view, 'Shift-Tab', handled);
              return handled;
            },
          },
          ...defaultKeymap,
          ...historyKeymap,
          indentWithTab,
        ]),
        longPayloadCollapsePlugin,
        EditorView.updateListener.of(update => {
          if (update.docChanged && !this._suppressUpdate) {
            this._onChange(update.state.doc.toString());
          }
          if (update.selectionSet) {
            const sel = this._buildSelectionInfo(update.state);
            this._onCursorMove(sel.lineFrom);
            this._onSelectionChange(sel);
          }
        }),
        EditorView.theme({
          '&': {
            height: '100%',
            fontSize: '14px',
            fontFamily: 'var(--se-font-mono, "Fira Code","Cascadia Code",Consolas,monospace)',
            color: 'var(--se-color-text, #1a1a1a)',
            backgroundColor: 'var(--se-color-bg, #ffffff)',
          },
          '.cm-editor': {
            backgroundColor: 'var(--se-color-bg, #ffffff)',
          },
          '.cm-scroller': {
            overflow: 'auto',
            scrollbarWidth: 'thin',
            scrollbarColor: 'var(--se-color-scrollbar-thumb, #c4ccd5) var(--se-color-scrollbar-track, #eef1f4)',
          },
          '.cm-gutters': {
            backgroundColor: 'var(--se-color-code-bg, #f6f8fa)',
            color: 'var(--se-color-muted, #6b7280)',
            borderRight: '1px solid var(--se-color-border, #d0d7de)',
          },
          '.cm-content': { padding: '8px 0' },
          '.cm-activeLine': {
            backgroundColor: 'color-mix(in srgb, var(--se-color-accent, #3b82f6) 12%, transparent)',
          },
          '.cm-activeLineGutter': {
            backgroundColor: 'color-mix(in srgb, var(--se-color-accent, #3b82f6) 16%, var(--se-color-code-bg, #f6f8fa))',
          },
          '.cm-se-collapse-widget': {
            color: 'var(--se-color-muted, #6b7280)',
            fontStyle: 'italic',
            userSelect: 'none',
          },
        }),
      ],
    });
  }

  _buildSelectionInfo(state) {
    const sel = state.selection.main;
    return {
      from: sel.from,
      to: sel.to,
      text: state.sliceDoc(sel.from, sel.to),
      lineFrom: state.doc.lineAt(sel.from).number - 1,
      lineTo: state.doc.lineAt(sel.to).number - 1,
    };
  }

  _handleScroll() {
    this._onScroll(this.getTopVisibleLine());
  }

  _emitHintKeyEvent(view, key, handled) {
    const head = view.state.selection.main.head;
    const line = view.state.doc.lineAt(head);
    this._onHintKey({
      key,
      handled,
      line: line.number - 1,
      lineText: line.text,
    });
  }
}
