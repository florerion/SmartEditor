/**
 * Inline AI assistant panel.
 */
export class AIAssistantPanel {
  /**
   * @param {HTMLElement} container
   * @param {object} [opts]
   * @param {(payload: object) => void|Promise<void>} [opts.onSubmit]
   * @param {() => void|Promise<void>} [opts.onApplySuggestion]
   */
  constructor(container, opts = {}) {
    this._container = container;
    this._onSubmit = opts.onSubmit ?? (() => {});
    this._onApplySuggestion = opts.onApplySuggestion ?? (() => {});

    this._isOpen = false;
    this._busy = false;
    this._hasSuggestion = false;

    this._container.classList.add('se-ai-assistant');
    this._container.hidden = true;
    this._container.innerHTML = _buildTemplate();

    this._form = this._container.querySelector('[data-se-ai-form]');
    this._modeEl = this._container.querySelector('[data-se-ai-mode]');
    this._instructionEl = this._container.querySelector('[data-se-ai-instruction]');
    this._statusEl = this._container.querySelector('[data-se-ai-status]');
    this._resultEl = this._container.querySelector('[data-se-ai-result]');
    this._submitBtn = this._container.querySelector('[data-se-ai-submit]');
    this._applyBtn = this._container.querySelector('[data-se-ai-apply]');
    this._closeBtn = this._container.querySelector('[data-se-ai-close]');

    this._boundSubmit = this._handleSubmit.bind(this);
    this._boundClick = this._handleClick.bind(this);

    this._form?.addEventListener('submit', this._boundSubmit);
    this._container.addEventListener('click', this._boundClick);
  }

  open() {
    this._isOpen = true;
    this._container.hidden = false;
    this._container.setAttribute('aria-hidden', 'false');
    this._instructionEl?.focus();
  }

  close() {
    this._isOpen = false;
    this._container.hidden = true;
    this._container.setAttribute('aria-hidden', 'true');
  }

  toggle() {
    if (this._isOpen) this.close();
    else this.open();
    return this._isOpen;
  }

  /** @returns {boolean} */
  isOpen() {
    return this._isOpen;
  }

  /**
   * @param {boolean} isBusy
   */
  setBusy(isBusy) {
    this._busy = isBusy === true;
    if (this._form) this._form.toggleAttribute('aria-busy', this._busy);
    if (this._submitBtn) this._submitBtn.disabled = this._busy;
    if (this._applyBtn) this._applyBtn.disabled = this._busy || !this._hasSuggestion;
  }

  /**
   * @param {{ text?: string, suggestedMarkdown?: string }} payload
   */
  setResult(payload = {}) {
    const text = typeof payload.text === 'string' ? payload.text.trim() : '';
    const suggestion = typeof payload.suggestedMarkdown === 'string' ? payload.suggestedMarkdown : '';

    this._hasSuggestion = Boolean(suggestion.trim());

    if (this._resultEl) {
      this._resultEl.textContent = text || 'Brak odpowiedzi z modelu.';
    }

    if (this._applyBtn) {
      this._applyBtn.disabled = this._busy || !this._hasSuggestion;
    }
  }

  /**
   * @param {string} message
   */
  setStatus(message) {
    if (!this._statusEl) return;
    this._statusEl.textContent = String(message ?? '');
  }

  /**
   * @param {string} text
   */
  setInstruction(text) {
    if (!this._instructionEl) return;
    this._instructionEl.value = String(text ?? '');
  }

  destroy() {
    this._form?.removeEventListener('submit', this._boundSubmit);
    this._container.removeEventListener('click', this._boundClick);
    this._container.innerHTML = '';
    this._container.hidden = true;
  }

  _handleSubmit(event) {
    event.preventDefault();
    if (this._busy) return;

    const payload = {
      mode: this._modeEl?.value ?? 'chat',
      instruction: this._instructionEl?.value ?? '',
    };

    this._onSubmit(payload);
  }

  _handleClick(event) {
    const closeTrigger = event.target.closest('[data-se-ai-close]');
    if (closeTrigger) {
      this.close();
      return;
    }

    const applyTrigger = event.target.closest('[data-se-ai-apply]');
    if (applyTrigger) {
      if (this._busy || !this._hasSuggestion) return;
      this._onApplySuggestion();
    }
  }
}

function _buildTemplate() {
  return `
    <div class="se-ai-assistant__header">
      <h3 class="se-ai-assistant__title">Smart Assistant</h3>
      <button type="button" class="se-ai-assistant__close" data-se-ai-close aria-label="Close Smart Assistant">&#215;</button>
    </div>
    <form class="se-ai-assistant__form" data-se-ai-form>
      <label class="se-ai-assistant__label">
        Mode
        <select class="se-ai-assistant__mode" data-se-ai-mode>
          <option value="review-document">Check Markdown</option>
          <option value="improve-selection">Improve Selection</option>
          <option value="rewrite-selection">Rewrite Selection</option>
          <option value="chat">Chat with Document Context</option>
        </select>
      </label>
      <label class="se-ai-assistant__label">
        Instruction
        <textarea
          class="se-ai-assistant__instruction"
          data-se-ai-instruction
          rows="4"
          placeholder="E.g. Improve the style to be more formal and concise."
        ></textarea>
      </label>
      <div class="se-ai-assistant__actions">
        <button type="submit" class="se-ai-assistant__btn se-ai-assistant__btn--primary" data-se-ai-submit>Send</button>
        <button type="button" class="se-ai-assistant__btn" data-se-ai-apply disabled>Apply Suggestion</button>
      </div>
      <p class="se-ai-assistant__status" data-se-ai-status></p>
      <pre class="se-ai-assistant__result" data-se-ai-result></pre>
    </form>
  `;
}
