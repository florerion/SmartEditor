import { EditorState, Transaction } from '@codemirror/state';
import {
  EditorView,
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
   */
  constructor(container, opts) {
    this._container = container;
    this._onChange = opts.onChange ?? (() => {});
    this._onCursorMove = opts.onCursorMove ?? (() => {});
    this._onSelectionChange = opts.onSelectionChange ?? (() => {});
    this._suppressUpdate = false;

    this._view = new EditorView({
      state: this._buildState(opts.value ?? ''),
      parent: container,
    });
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

  /** @returns {number} 0-based current cursor line */
  getCursorLine() {
    const state = this._view.state;
    return state.doc.lineAt(state.selection.main.head).number - 1;
  }

  undo() { cmUndo(this._view); }
  redo() { cmRedo(this._view); }

  focus() { this._view.focus(); }

  destroy() { this._view.destroy(); }

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
            fontFamily: 'var(--mde-font-mono, "Fira Code","Cascadia Code",Consolas,monospace)',
          },
          '.cm-scroller': { overflow: 'auto' },
          '.cm-content': { padding: '8px 0' },
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
}
