import { EditorState, RangeSetBuilder, Transaction } from '@codemirror/state';
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
   */
  constructor(container, opts) {
    this._container = container;
    this._onChange = opts.onChange ?? (() => {});
    this._onCursorMove = opts.onCursorMove ?? (() => {});
    this._onSelectionChange = opts.onSelectionChange ?? (() => {});
    this._onScroll = opts.onScroll ?? (() => {});
    this._suppressUpdate = false;

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

  destroy() {
    this._scroller?.removeEventListener('scroll', this._boundScroll);
    this._view.destroy();
  }

  // ------ private ------

  _buildState(value) {
    return EditorState.create({
      doc: value,
      extensions: [
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
          },
          '.cm-scroller': { overflow: 'auto' },
          '.cm-content': { padding: '8px 0' },
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
}
