/**
 * Manages document state with basic undo/redo history.
 * CodeMirror has its own undo stack for the code panel;
 * this State class tracks the canonical markdown string
 * and is the single source of truth.
 */
export class State {
  /** @param {string} initialValue */
  constructor(initialValue = '') {
    this._value = initialValue;
  }

  get value() {
    return this._value;
  }

  /**
   * @param {string} newValue
   * @param {object} [opts]
   * @param {boolean} [opts.undoable=true]
   */
  setValue(newValue, { undoable = true } = {}) {
    if (newValue === this._value) return;
    this._value = newValue;
  }
}
