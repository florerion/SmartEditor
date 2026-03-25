import hljs from 'highlight.js/lib/core';
import bash from 'highlight.js/lib/languages/bash';
import c from 'highlight.js/lib/languages/c';
import cpp from 'highlight.js/lib/languages/cpp';
import diff from 'highlight.js/lib/languages/diff';
import django from 'highlight.js/lib/languages/django';
import dockerfile from 'highlight.js/lib/languages/dockerfile';
import excel from 'highlight.js/lib/languages/excel';
import graphql from 'highlight.js/lib/languages/graphql';
import handlebars from 'highlight.js/lib/languages/handlebars';
import http from 'highlight.js/lib/languages/http';
import java from 'highlight.js/lib/languages/java';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import kotlin from 'highlight.js/lib/languages/kotlin';
import lisp from 'highlight.js/lib/languages/lisp';
import lua from 'highlight.js/lib/languages/lua';
import makefile from 'highlight.js/lib/languages/makefile';
import markdown from 'highlight.js/lib/languages/markdown';
import mathematica from 'highlight.js/lib/languages/mathematica';
import matlab from 'highlight.js/lib/languages/matlab';
import nginx from 'highlight.js/lib/languages/nginx';
import objectivec from 'highlight.js/lib/languages/objectivec';
import perl from 'highlight.js/lib/languages/perl';
import php from 'highlight.js/lib/languages/php';
import plaintext from 'highlight.js/lib/languages/plaintext';
import powershell from 'highlight.js/lib/languages/powershell';
import python from 'highlight.js/lib/languages/python';
import ruby from 'highlight.js/lib/languages/ruby';
import scala from 'highlight.js/lib/languages/scala';
import shell from 'highlight.js/lib/languages/shell';
import sql from 'highlight.js/lib/languages/sql';
import swift from 'highlight.js/lib/languages/swift';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';
import MarkdownIt from 'markdown-it';

let highlightLanguagesRegistered = false;

const SUPPORTED_CODE_LANGUAGE_OPTIONS = Object.freeze([
  { value: 'bash', label: 'Bash' },
  { value: 'c', label: 'C' },
  { value: 'cpp', label: 'C++' },
  { value: 'curl', label: 'cURL' },
  { value: 'diff', label: 'Diff' },
  { value: 'django', label: 'Django' },
  { value: 'dockerfile', label: 'Dockerfile' },
  { value: 'excel', label: 'Excel' },
  { value: 'graphql', label: 'GraphQL' },
  { value: 'handlebars', label: 'Handlebars' },
  { value: 'http', label: 'HTTP' },
  { value: 'xml', label: 'HTML/XML' },
  { value: 'java', label: 'Java' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'json', label: 'JSON' },
  { value: 'kotlin', label: 'Kotlin' },
  { value: 'lisp', label: 'Lisp' },
  { value: 'lua', label: 'Lua' },
  { value: 'makefile', label: 'Makefile' },
  { value: 'markdown', label: 'Markdown' },
  { value: 'mathematica', label: 'Mathematica' },
  { value: 'matlab', label: 'Matlab' },
  { value: 'nginx', label: 'Nginx' },
  { value: 'objectivec', label: 'Objective-C' },
  { value: 'php', label: 'PHP' },
  { value: 'perl', label: 'Perl' },
  { value: 'plaintext', label: 'Plaintext' },
  { value: 'powershell', label: 'PowerShell' },
  { value: 'python', label: 'Python' },
  { value: 'ruby', label: 'Ruby' },
  { value: 'sql', label: 'SQL' },
  { value: 'scala', label: 'Scala' },
  { value: 'shell', label: 'Shell' },
  { value: 'swift', label: 'Swift' },
  { value: 'typescript', label: 'TypeScript' },
]);
const SUPPORTED_CODE_LANGUAGE_VALUES = new Set(
  SUPPORTED_CODE_LANGUAGE_OPTIONS.map(({ value }) => value),
);

const LANGUAGE_ALIASES = Object.freeze({
  bash: 'bash',
  js: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  jsx: 'javascript',
  javascript: 'javascript',
  javacript: 'javascript',
  ts: 'typescript',
  mts: 'typescript',
  cts: 'typescript',
  tsx: 'typescript',
  typescript: 'typescript',
  c: 'c',
  h: 'c',
  'c++': 'cpp',
  cpp: 'cpp',
  cxx: 'cpp',
  cc: 'cpp',
  hpp: 'cpp',
  hxx: 'cpp',
  hh: 'cpp',
  curl: 'bash',
  html: 'xml',
  xhtml: 'xml',
  svg: 'xml',
  rss: 'xml',
  atom: 'xml',
  xml: 'xml',
  shell: 'shell',
  sh: 'bash',
  zsh: 'bash',
  console: 'shell',
  terminal: 'shell',
  powershell: 'powershell',
  ps: 'powershell',
  ps1: 'powershell',
  pwsh: 'powershell',
  django: 'django',
  jinja: 'django',
  dockerfile: 'dockerfile',
  docker: 'dockerfile',
  excel: 'excel',
  xls: 'excel',
  xlsx: 'excel',
  graphql: 'graphql',
  gql: 'graphql',
  graphqls: 'graphql',
  handlebars: 'handlebars',
  hbs: 'handlebars',
  http: 'http',
  https: 'http',
  json: 'json',
  jsonc: 'json',
  java: 'java',
  kotlin: 'kotlin',
  kts: 'kotlin',
  lisp: 'lisp',
  lua: 'lua',
  make: 'makefile',
  makefile: 'makefile',
  md: 'markdown',
  markdown: 'markdown',
  mathematica: 'mathematica',
  mma: 'mathematica',
  wolfram: 'mathematica',
  'wolfram-language': 'mathematica',
  matlab: 'matlab',
  nginx: 'nginx',
  nginxconf: 'nginx',
  objectivec: 'objectivec',
  objc: 'objectivec',
  'objective-c': 'objectivec',
  'obj-c': 'objectivec',
  php: 'php',
  rb: 'ruby',
  ruby: 'ruby',
  gemfile: 'ruby',
  rake: 'ruby',
  py: 'python',
  python: 'python',
  perl: 'perl',
  pl: 'perl',
  pm: 'perl',
  text: 'plaintext',
  plaintext: 'plaintext',
  plain: 'plaintext',
  txt: 'plaintext',
  log: 'plaintext',
  none: 'plaintext',
  nohighlight: 'plaintext',
  sql: 'sql',
  scala: 'scala',
  swift: 'swift',
  diff: 'diff',
  patch: 'diff',
});

const REGISTERED_HLJS_LANGUAGES = Object.freeze([
  ['bash', bash],
  ['c', c],
  ['cpp', cpp],
  ['diff', diff],
  ['django', django],
  ['dockerfile', dockerfile],
  ['excel', excel],
  ['graphql', graphql],
  ['handlebars', handlebars],
  ['http', http],
  ['java', java],
  ['javascript', javascript],
  ['json', json],
  ['kotlin', kotlin],
  ['lisp', lisp],
  ['lua', lua],
  ['makefile', makefile],
  ['markdown', markdown],
  ['mathematica', mathematica],
  ['matlab', matlab],
  ['nginx', nginx],
  ['objectivec', objectivec],
  ['perl', perl],
  ['php', php],
  ['plaintext', plaintext],
  ['powershell', powershell],
  ['python', python],
  ['ruby', ruby],
  ['scala', scala],
  ['shell', shell],
  ['sql', sql],
  ['swift', swift],
  ['typescript', typescript],
  ['xml', xml],
]);

function registerHighlightLanguages() {
  if (highlightLanguagesRegistered) return;

  REGISTERED_HLJS_LANGUAGES.forEach(([name, definition]) => {
    hljs.registerLanguage(name, definition);
  });

  highlightLanguagesRegistered = true;
}

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
    registerHighlightLanguages();

    this._md = new MarkdownIt({
      html:        true,
      linkify:     true,
      typographer: true,
      breaks:      false,
      ...markdownIt,
    });
    this._hljs = hljs;

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
      const codeLang = this._normalizeLanguageName(langName);
      const selectedLang = this._resolveSelectedCodeLanguage(langName, codeLang);
      const langClass = codeLang
        ? ` class="hljs language-${this._esc(codeLang)}"`
        : ' class="hljs"';
      const preAttrs  = self.renderAttrs(token);
      const lineAttrs = srcLine >= 0
        ? ` data-source-line="${srcLine}" data-source-line-end="${srcEnd}"`
        : '';
      const languageSelect = this._renderCodeBlockToolbar(selectedLang, srcLine);

      const rawLines  = token.content.split('\n');
      // markdown-it always appends a trailing \n → last split element is empty
      const codeLines = rawLines[rawLines.length - 1] === ''
        ? rawLines.slice(0, -1)
        : rawLines;
      const codeContent = codeLines.join('\n');
      const highlightedHtml = this._highlightCode(codeContent, codeLang);
      const highlightedLines = this._splitHighlightedHtmlLines(highlightedHtml);

      const linesHtml = codeLines
        .map((line, i) => {
          const docLine = srcLine >= 0 ? srcLine + 1 + i : i;
          const lineHtml = highlightedLines[i] ?? this._esc(line);
          return `<span data-source-line="${docLine}">${lineHtml}\n</span>`;
        })
        .join('');

      return (
        `<div class="se-code-block"${lineAttrs}>` +
          languageSelect +
          `<pre${preAttrs}><code${langClass}>${linesHtml}</code></pre>` +
        `</div>\n`
      );
    };
  }

  _resolveSelectedCodeLanguage(rawLang, normalizedLang) {
    const raw = String(rawLang || '').trim().toLowerCase();
    if (SUPPORTED_CODE_LANGUAGE_VALUES.has(raw)) return raw;
    if (SUPPORTED_CODE_LANGUAGE_VALUES.has(normalizedLang)) return normalizedLang;
    return '';
  }

  _renderCodeBlockToolbar(selectedLang, srcLine) {
    if (srcLine < 0) return '';

    const placeholder = '<option value="" disabled hidden>Language</option>';
    const options = SUPPORTED_CODE_LANGUAGE_OPTIONS
      .map(({ value, label }) => {
        const selected = value === selectedLang ? ' selected' : '';
        return `<option value="${this._escAtt(value)}"${selected}>${this._esc(label)}</option>`;
      })
      .join('');

    return (
      `<div class="se-code-block__toolbar" data-source-line="${srcLine}" data-source-line-end="${srcLine}">` +
        `<select class="se-code-block__lang-select" aria-label="Code block language" data-source-line="${srcLine}">` +
          `${selectedLang ? '' : placeholder}` +
          options +
        `</select>` +
        `<button class="se-code-block__copy-btn" type="button" title="Copy" aria-label="Copy code"></button>` +
      `</div>`
    );
  }

  _normalizeLanguageName(langName) {
    if (!langName) return '';

    const normalized = String(langName).trim().toLowerCase();
    return LANGUAGE_ALIASES[normalized] ?? normalized;
  }

  _highlightCode(code, langName) {
    if (!code) return '';
    if (!langName || !this._hljs.getLanguage(langName)) {
      return this._esc(code);
    }

    try {
      return this._hljs.highlight(code, {
        language: langName,
        ignoreIllegals: true,
      }).value;
    } catch {
      return this._esc(code);
    }
  }

  _splitHighlightedHtmlLines(html) {
    const lines = [];
    const openTags = [];
    let current = '';

    for (let index = 0; index < html.length; index++) {
      const char = html[index];

      if (char === '<') {
        const tagEnd = html.indexOf('>', index);
        if (tagEnd === -1) {
          current += html.slice(index);
          break;
        }

        const rawTag = html.slice(index, tagEnd + 1);
        current += rawTag;
        this._trackOpenTag(rawTag, openTags);
        index = tagEnd;
        continue;
      }

      if (char === '\n') {
        lines.push(`${current}${this._closeOpenTags(openTags)}`);
        current = this._reopenTags(openTags);
        continue;
      }

      current += char;
    }

    lines.push(current);
    return lines;
  }

  _trackOpenTag(rawTag, openTags) {
    const match = rawTag.match(/^<\/?([a-z0-9:-]+)/i);
    if (!match) return;

    const tagName = match[1].toLowerCase();
    if (rawTag.startsWith('</')) {
      for (let index = openTags.length - 1; index >= 0; index--) {
        if (openTags[index].name === tagName) {
          openTags.splice(index, 1);
          break;
        }
      }
      return;
    }

    if (/\/>$/.test(rawTag) || rawTag.startsWith('<!')) return;
    openTags.push({ name: tagName, rawTag });
  }

  _closeOpenTags(openTags) {
    return openTags
      .slice()
      .reverse()
      .map(({ name }) => `</${name}>`)
      .join('');
  }

  _reopenTags(openTags) {
    return openTags.map(({ rawTag }) => rawTag).join('');
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
