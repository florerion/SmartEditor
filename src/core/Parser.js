import MarkdownIt from 'markdown-it';

/**
 * Wraps markdown-it and extends it with:
 *  - Source-map attributes (`data-source-line`, `data-source-line-end`) on every
 *    block-level element — drives code↔preview synchronisation.
 *  - Per-line `<span data-source-line="N">` inside fenced code blocks — enables
 *    jumping to a specific code line from the preview.
 *  - Table-cell column tracking (`data-source-col`) for cell-level sync.
 *  - Image `|WxH` alt-text parsing — stores resize info in alt, renders as
 *    `<img width="W" height="H">`.
 *  - Mermaid fenced blocks rendered as `<div class="se-mermaid" data-code="...">`.
 *  - Block math `$$...$$` and inline math `$...$` rendered as placeholder elements
 *    with `data-tex` — KaTeX renders them in a post-render step in EditorCore.
 */
export class Parser {
  /**
   * @param {object} [opts]
   * @param {object} [opts.markdownIt]  Options forwarded to the markdown-it constructor
   * @param {Array}  [opts.plugins]     [[pluginFn, pluginOptions?], ...]
   */
  constructor({ markdownIt = {}, plugins = [] } = {}) {
    this._md = new MarkdownIt({
      html:        true,
      linkify:     true,
      typographer: true,
      breaks:      false,
      ...markdownIt,
    });

    // Instance state used during synchronous render passes
    this._currentRowLine = -1;
    this._colIndex       = 0;

    plugins.forEach(entry => {
      const [plugin, opts] = Array.isArray(entry) ? entry : [entry];
      this._md.use(plugin, opts);
    });

    this._addMathRules();
    this._addDrawioRules();
    this._patchRenderers();
  }

  /**
   * Parse and render markdown to HTML with all source-map and special-block attributes.
   * @param {string} markdown
   * @returns {{ html: string, tokens: object[] }}
   */
  render(markdown) {
    // Reset table-cell tracking for this synchronous pass
    this._currentRowLine = -1;
    this._colIndex       = 0;

    const env    = {};
    const tokens = this._md.parse(markdown, env);
    const html   = this._md.renderer.render(tokens, this._md.options, env);
    return { html, tokens };
  }

  /** @returns {import('markdown-it')} */
  getInstance() {
    return this._md;
  }

  // ============================================================
  // Private
  // ============================================================

  // ------------------------------------------------------------
  // Math rules (inline $...$ and block $$...$$)
  // ------------------------------------------------------------
  _addMathRules() {
    const md = this._md;

    // Block math — opening $$ must be alone on its line
    md.block.ruler.before('fence', 'math_block', (state, startLine, endLine, silent) => {
      const startPos = state.bMarks[startLine] + state.tShift[startLine];
      const lineText = state.src.slice(startPos, state.eMarks[startLine]).trim();
      if (lineText !== '$$') return false;
      if (silent) return true;

      let nextLine = startLine + 1;
      let found    = false;
      while (nextLine < endLine) {
        const lPos = state.bMarks[nextLine] + state.tShift[nextLine];
        if (state.src.slice(lPos, state.eMarks[nextLine]).trim() === '$$') {
          found = true;
          break;
        }
        nextLine++;
      }
      if (!found) return false;

      const token   = state.push('math_block', 'div', 0);
      token.block   = true;
      token.content = state.getLines(startLine + 1, nextLine, 0, true).trim();
      token.map     = [startLine, nextLine + 1];
      token.markup  = '$$';
      state.line    = nextLine + 1;
      return true;
    });

    // Inline math — single $...$ with no newlines inside
    md.inline.ruler.before('escape', 'math_inline', (state, silent) => {
      const src = state.src;
      const pos = state.pos;
      if (src.charCodeAt(pos) !== 0x24 /* $ */) return false;

      const start = pos + 1;
      if (start >= state.posMax) return false;
      if (src.charCodeAt(start) === 0x24) return false; // $$ is block, not inline

      let end = start;
      while (end <= state.posMax) {
        const ch = src.charCodeAt(end);
        if (ch === 0x24) break;
        if (ch === 0x0a) return false; // newline inside $...$ → not math
        end++;
      }
      if (end > state.posMax || end === start) return false;

      if (!silent) {
        const token   = state.push('math_inline', 'span', 0);
        token.markup  = '$';
        token.content = src.slice(start, end);
      }
      state.pos = end + 1;
      return true;
    });

    // Renderers — produce placeholder elements; KaTeX fills them in post-render
    md.renderer.rules.math_block = (tokens, idx) => {
      const t = tokens[idx];
      const lineAttrs = t.map
        ? ` data-source-line="${t.map[0]}" data-source-line-end="${t.map[1] - 1}"`
        : '';
      return `<div class="se-math-block"${lineAttrs} data-tex="${encodeURIComponent(t.content)}"></div>\n`;
    };

    md.renderer.rules.math_inline = (tokens, idx) => {
      const t = tokens[idx];
      return `<span class="se-math-inline" data-tex="${encodeURIComponent(t.content)}"></span>`;
    };
  }

  // ------------------------------------------------------------
  // draw.io markdown block rule: ![draw.io](image-src){xml-or-uri-encoded-xml}
  // ------------------------------------------------------------
  _addDrawioRules() {
    const md = this._md;

    md.block.ruler.before('paragraph', 'drawio_image_block', (state, startLine, endLine, silent) => {
      const startPos = state.bMarks[startLine] + state.tShift[startLine];
      const lineText = state.src.slice(startPos, state.eMarks[startLine]).trim();
      const parsed = this._parseDrawioImageLine(lineText);
      if (!parsed) return false;
      if (silent) return true;

      const token = state.push('drawio_image_block', 'div', 0);
      token.block = true;
      token.attrSet('data-drawio-src', parsed.src);
      token.content = parsed.payload;
      token.map = [startLine, startLine + 1];
      state.line = startLine + 1;
      return true;
    });

    md.renderer.rules.drawio_image_block = (tokens, idx) => {
      const token = tokens[idx];
      const imageSrc = token.attrGet('data-drawio-src') ?? '';
      const encodedPayload = token.content;
      const lineAttrs = token.map
        ? ` data-source-line="${token.map[0]}" data-source-line-end="${token.map[1] - 1}"`
        : '';

      return `<img class="se-drawio" data-se-drawio-open data-drawio="${this._escAtt(encodedPayload)}"${lineAttrs} src="${this._escAtt(imageSrc)}" alt="draw.io diagram" loading="lazy">\n`;
    };
  }

  // ------------------------------------------------------------
  // All other renderer patches
  // ------------------------------------------------------------
  _patchRenderers() {
    const md = this._md;

    // ---- block elements that get data-source-line ----
    [
      'paragraph_open',
      'heading_open',
      'blockquote_open',
      'bullet_list_open',
      'ordered_list_open',
      'list_item_open',
      'table_open',
      'thead_open',
      'tbody_open',
      'html_block',
      'hr',
      'code_block',
    ].forEach(type => {
      const orig = md.renderer.rules[type];
      md.renderer.rules[type] = (tokens, idx, options, env, self) => {
        const token = tokens[idx];
        if (token.map) {
          token.attrSet('data-source-line',     String(token.map[0]));
          token.attrSet('data-source-line-end', String(token.map[1] - 1));
        }
        if (orig) return orig(tokens, idx, options, env, self);
        return self.renderToken(tokens, idx, options);
      };
    });

    // ---- table row / cell tracking ----
    md.renderer.rules.tr_open = (tokens, idx, options, env, self) => {
      const token = tokens[idx];
      if (token.map) {
        this._currentRowLine = token.map[0];
        token.attrSet('data-source-line',     String(this._currentRowLine));
        token.attrSet('data-source-line-end', String(token.map[1] - 1));
      }
      this._colIndex = 0;
      return self.renderToken(tokens, idx, options);
    };

    md.renderer.rules.tr_close = (tokens, idx, options, env, self) => {
      this._colIndex = 0;
      return self.renderToken(tokens, idx, options);
    };

    const cellOpen = (tokens, idx, options, env, self) => {
      const token = tokens[idx];
      if (this._currentRowLine >= 0) {
        token.attrSet('data-source-line', String(this._currentRowLine));
        token.attrSet('data-source-col',  String(this._colIndex));
      }
      this._colIndex++;
      return self.renderToken(tokens, idx, options);
    };
    md.renderer.rules.td_open = cellOpen;
    md.renderer.rules.th_open = cellOpen;

    // ---- image renderer: parse |WxH from alt ----
    md.renderer.rules.image = (tokens, idx, options, env, self) => {
      const token = tokens[idx];
      const src   = token.attrGet('src') ?? '';
      const title = token.attrGet('title');
      let   alt   = self.renderInlineAsText(token.children, options, env);

      let width = null, height = null;
      const m = alt.match(/^([\s\S]*)\|(\d+)x(\d+)$/);
      if (m) { alt = m[1]; width = m[2]; height = m[3]; }

      let attrs = `src="${this._escAtt(src)}" alt="${this._escAtt(alt)}" class="se-image"`;
      if (title)  attrs += ` title="${this._escAtt(title)}"`;
      if (width)  attrs += ` width="${width}"`;
      if (height) attrs += ` height="${height}"`;

      return `<img ${attrs}>`;
    };

    // ---- fence: mermaid special blocks; others → per-line spans ----
    md.renderer.rules.fence = (tokens, idx, options, env, self) => {
      const token    = tokens[idx];
      const langName = (token.info || '').trim().split(/\s+/)[0];
      const srcLine  = token.map ? token.map[0]     : -1;
      const srcEnd   = token.map ? token.map[1] - 1 : srcLine;

      if (srcLine >= 0) {
        token.attrSet('data-source-line',     String(srcLine));
        token.attrSet('data-source-line-end', String(srcEnd));
      }

      // --- Mermaid ---
      if (langName === 'mermaid') {
        const lineAttrs = srcLine >= 0
          ? ` data-source-line="${srcLine}" data-source-line-end="${srcEnd}"`
          : '';
        const encoded = encodeURIComponent(token.content);
        return (
          `<div class="se-mermaid"${lineAttrs} data-code="${encoded}">` +
          `<pre class="se-mermaid__fallback"><code>${this._esc(token.content)}</code></pre>` +
          `</div>\n`
        );
      }

      // --- Regular fenced block with per-line sync spans ---
      const langClass = langName ? ` class="language-${this._esc(langName)}"` : '';
      const preAttrs  = self.renderAttrs(token);

      const rawLines  = token.content.split('\n');
      // markdown-it always appends a trailing \n → last split element is empty
      const codeLines = rawLines[rawLines.length - 1] === ''
        ? rawLines.slice(0, -1)
        : rawLines;

      const linesHtml = codeLines
        .map((line, i) => {
          const docLine = srcLine >= 0 ? srcLine + 1 + i : i;
          return `<span data-source-line="${docLine}">${this._esc(line)}\n</span>`;
        })
        .join('');

      return `<pre${preAttrs}><code${langClass}>${linesHtml}</code></pre>\n`;
    };
  }

  _esc(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  _escAtt(str) {
    return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  }

  _parseDrawioImageLine(line) {
    const match = line.match(/^!\[draw\.io\]\((.*)\)\{([\s\S]*)\}$/);
    if (!match) return null;

    const src = match[1].trim();
    const payload = match[2].trim();
    if (!src || !payload) return null;

    return { src, payload };
  }
}
