/**
 * Built-in helper factories for preview rules.
 */

/**
 * Create an HTML-phase rule that prefixes relative image src URLs.
 *
 * @param {object} [opts]
 * @param {string} [opts.id='image-relative-src-prefix']
 * @param {string} [opts.prefix='']
 * @param {number} [opts.order=100]
 * @returns {object}
 */
export function createImageRelativeSrcPrefixRule(opts = {}) {
  const id = typeof opts.id === 'string' && opts.id.trim()
    ? opts.id.trim()
    : 'image-relative-src-prefix';
  const prefix = _normalizePrefix(opts.prefix ?? '');

  return {
    id,
    phase: 'html',
    order: Number.isFinite(opts.order) ? opts.order : 100,
    enabled: opts.enabled !== false,
    match: (input) => prefix.length > 0 && /<img\b/i.test(input),
    run: (input) => {
      if (!prefix) return input;

      const parser = new DOMParser();
      const doc = parser.parseFromString(String(input ?? ''), 'text/html');
      const images = Array.from(doc.querySelectorAll('img[src]'));
      let touched = false;

      images.forEach((img) => {
        const src = String(img.getAttribute('src') ?? '').trim();
        if (!src || !_isRelativeSrc(src)) return;
        const next = _joinPrefix(prefix, src);
        if (next === src) return;
        img.setAttribute('src', next);
        touched = true;
      });

      return {
        content: doc.body.innerHTML,
        meta: {
          touched,
        },
      };
    },
    config: {
      prefix,
    },
  };
}

/**
 * Create a markdown-phase rule resolving include directives:
 * {% include "path/to/file.md" %}
 *
 * @param {object} [opts]
 * @param {string} [opts.id='markdown-include-directive']
 * @param {number} [opts.order=100]
 * @param {number} [opts.maxDepth=5]
 * @param {string[]} [opts.allowPaths=[]]
 * @param {(path:string, req:object) => Promise<string>|string} [opts.resolve]
 * @returns {object}
 */
export function createMarkdownIncludeDirectiveRule(opts = {}) {
  const id = typeof opts.id === 'string' && opts.id.trim()
    ? opts.id.trim()
    : 'markdown-include-directive';
  const annotateIncludes = opts.annotate === true;

  return {
    id,
    phase: 'markdown',
    order: Number.isFinite(opts.order) ? opts.order : 100,
    enabled: opts.enabled !== false,
    async: true,
    match: (input) => INCLUDE_DIRECTIVE_TEST_PATTERN.test(String(input ?? '')),
    run: async (input, ctx) => {
      const resolveInclude = typeof opts.resolve === 'function'
        ? opts.resolve
        : ctx.services?.includeResolver;

      if (typeof resolveInclude !== 'function') {
        return {
          content: String(input ?? ''),
          meta: {
            touched: false,
            notes: ['No include resolver configured.'],
          },
        };
      }

      const policy = ctx.policy?.include ?? {};
      const maxDepth = Number.isFinite(opts.maxDepth)
        ? Math.max(0, opts.maxDepth)
        : (Number.isFinite(policy.maxDepth) ? Math.max(0, policy.maxDepth) : 5);

      const allowPaths = Array.isArray(opts.allowPaths)
        ? opts.allowPaths
        : (Array.isArray(policy.allowPaths) ? policy.allowPaths : []);

      const normalizedAllowPaths = allowPaths
        .filter((entry) => typeof entry === 'string' && entry.trim())
        .map((entry) => _normalizePath(entry));

      const includeStack = [];
      const source = String(input ?? '');
      const expanded = await _expandIncludes(source, {
        resolveInclude,
        maxDepth,
        allowPaths: normalizedAllowPaths,
        includeStack,
        annotateIncludes,
        includeIdSeq: 0,
        signal: ctx.signal,
        renderVersion: ctx.renderVersion,
      });

      return {
        content: expanded,
        meta: {
          touched: expanded !== source,
        },
      };
    },
    config: {
      maxDepth: Number.isFinite(opts.maxDepth) ? Math.max(0, opts.maxDepth) : undefined,
      allowPaths: Array.isArray(opts.allowPaths) ? [...opts.allowPaths] : undefined,
      annotate: annotateIncludes,
    },
  };
}

/**
 * Create an HTML-phase rule that remaps included content source-line attributes
 * to the original include directive line using include comment annotations.
 *
 * @param {object} [opts]
 * @param {string} [opts.id='include-source-map']
 * @param {number} [opts.order=160]
 * @param {boolean} [opts.removeMarkers=false]
 * @returns {object}
 */
export function createIncludeSourceMapRule(opts = {}) {
  const id = typeof opts.id === 'string' && opts.id.trim()
    ? opts.id.trim()
    : 'include-source-map';
  const removeMarkers = opts.removeMarkers === true;

  return {
    id,
    phase: 'html',
    order: Number.isFinite(opts.order) ? opts.order : 160,
    enabled: opts.enabled !== false,
    match: (input) => /data-se-include-start=/.test(String(input ?? '')),
    run: (input) => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(String(input ?? ''), 'text/html');
      const starts = Array.from(doc.body.querySelectorAll('[data-se-include-start]'));
      const includeMappedElements = new Set();
      const includeRanges = [];

      let touched = false;
      starts.forEach((startEl) => {
        const startMeta = _parseIncludeStartMarker(startEl.getAttribute('data-se-include-start') ?? '');
        if (!startMeta || !Number.isInteger(startMeta.sourceLine)) return;

        const parent = startEl.parentNode;
        if (!parent) return;

        const endNode = _findIncludeEndNode(startEl, startMeta.id);
        if (!endNode) return;

        const elementsBetween = _collectElementsBetween(startEl, endNode)
          .filter((el) => el !== startEl && el !== endNode);
        elementsBetween.forEach((el) => {
          _setSourceLineAttrs(el, startMeta.sourceLine, startMeta.sourceLineEnd);
          includeMappedElements.add(el);
          touched = true;
        });

        const markerShift = Number.isInteger(startMeta.downstreamShift)
          ? Math.max(0, startMeta.downstreamShift)
          : 0;

        const renderedEndLine = _getNodeSourceLine(endNode);
        const fallbackShift = Number.isInteger(renderedEndLine)
          ? Math.max(0, renderedEndLine - startMeta.sourceLine - 1)
          : 0;

        const downstreamShift = markerShift || fallbackShift;
        if (downstreamShift > 0) {
          includeRanges.push({
            startNode: startEl,
            endNode,
            downstreamShift,
          });
        }

        if (removeMarkers) {
          parent.removeChild(startEl);
          parent.removeChild(endNode);
        }
      });

      const topLevelRanges = includeRanges.filter((candidate) => !includeRanges.some((other) => {
        if (other === candidate) return false;
        return _isNodeStrictlyBetween(candidate.startNode, other.startNode, other.endNode);
      }));

      const mappedElements = Array.from(doc.body.querySelectorAll('[data-source-line]'));
      mappedElements.forEach((el) => {
        if (includeMappedElements.has(el)) return;

        const totalShift = topLevelRanges.reduce((sum, range) => {
          if (_isNodeAfter(el, range.endNode)) {
            return sum + range.downstreamShift;
          }
          return sum;
        }, 0);

        if (totalShift > 0) {
          _shiftSourceLineAttrs(el, -totalShift);
          touched = true;
        }
      });

      return {
        content: doc.body.innerHTML,
        meta: {
          touched,
        },
      };
    },
    config: {
      removeMarkers,
    },
  };
}

/**
 * Create an HTML-phase rule decorating include regions with an optional
 * collapsible wrapper and metadata header.
 *
 * Requires include annotations produced by `createMarkdownIncludeDirectiveRule({ annotate: true })`.
 *
 * @param {object} [opts]
 * @param {string} [opts.id='include-decoration']
 * @param {number} [opts.order=220]
 * @param {boolean} [opts.collapsible=true]
 * @param {boolean} [opts.defaultCollapsed=false]
 * @param {boolean} [opts.removeMarkers=true]
 * @param {string} [opts.label='Included snippet']
 * @param {string} [opts.statusLabel='expanded']
 * @param {string} [opts.collapsedStatusLabel='collapsed']
 * @param {string} [opts.expandLabel='Tap to expand']
 * @param {string} [opts.collapseLabel='Tap to collapse']
 * @param {string} [opts.hint='Source: include directive']
 * @param {object} [opts.classNames]
 * @returns {object}
 */
export function createIncludeDecorationRule(opts = {}) {
  const id = typeof opts.id === 'string' && opts.id.trim()
    ? opts.id.trim()
    : 'include-decoration';
  const collapsible = opts.collapsible !== false;
  const defaultCollapsed = opts.defaultCollapsed === true;
  const removeMarkers = opts.removeMarkers !== false;
  const label = typeof opts.label === 'string' && opts.label.trim()
    ? opts.label.trim()
    : 'Included snippet';
  const statusLabel = typeof opts.statusLabel === 'string' && opts.statusLabel.trim()
    ? opts.statusLabel.trim()
    : 'expanded';
  const collapsedStatusLabel = typeof opts.collapsedStatusLabel === 'string' && opts.collapsedStatusLabel.trim()
    ? opts.collapsedStatusLabel.trim()
    : 'collapsed';
  const expandLabel = typeof opts.expandLabel === 'string' && opts.expandLabel.trim()
    ? opts.expandLabel.trim()
    : 'Tap to expand';
  const collapseLabel = typeof opts.collapseLabel === 'string' && opts.collapseLabel.trim()
    ? opts.collapseLabel.trim()
    : 'Tap to collapse';
  const hint = typeof opts.hint === 'string' && opts.hint.trim()
    ? opts.hint.trim()
    : 'Source: include directive';

  const classNames = {
    block: 'se-include-block',
    header: 'se-include-header',
    label: 'se-include-label',
    path: 'se-include-path',
    pill: 'se-include-pill',
    pillExpanded: 'se-include-pill-expanded',
    pillCollapsed: 'se-include-pill-collapsed',
    body: 'se-include-body',
    toggle: 'se-include-toggle',
    toggleExpand: 'se-include-toggle-expand',
    toggleCollapse: 'se-include-toggle-collapse',
    chevron: 'se-include-chevron',
    hint: 'se-include-hover-hint',
    ...(opts.classNames && typeof opts.classNames === 'object' ? opts.classNames : {}),
  };

  return {
    id,
    phase: 'html',
    order: Number.isFinite(opts.order) ? opts.order : 220,
    enabled: opts.enabled !== false,
    match: (input) => /data-se-include-start=/.test(String(input ?? '')),
    run: (input) => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(String(input ?? ''), 'text/html');
      const startMarkers = Array.from(doc.body.querySelectorAll('[data-se-include-start]'));
      let touched = false;

      startMarkers.forEach((startMarker) => {
        const startMeta = _parseIncludeStartMarker(startMarker.getAttribute('data-se-include-start') ?? '');
        if (!startMeta) return;

        const endNode = _findIncludeEndNode(startMarker, startMeta.id);
        if (!endNode) return;

        const parent = startMarker.parentNode;
        if (!parent) return;

        const block = collapsible
          ? doc.createElement('details')
          : doc.createElement('div');
        block.className = classNames.block;
        if (collapsible && defaultCollapsed !== true) {
          block.setAttribute('open', '');
        }

        const header = collapsible
          ? doc.createElement('summary')
          : doc.createElement('div');
        header.className = classNames.header;

        const labelEl = doc.createElement('span');
        labelEl.className = classNames.label;
        labelEl.textContent = label;

        const pathEl = doc.createElement('span');
        pathEl.className = classNames.path;
        pathEl.textContent = startMeta.path || 'include';

        const pillEl = doc.createElement('span');
        pillEl.className = classNames.pill;

        const pillExpandedEl = doc.createElement('span');
        pillExpandedEl.className = classNames.pillExpanded;
        pillExpandedEl.textContent = statusLabel;

        const pillCollapsedEl = doc.createElement('span');
        pillCollapsedEl.className = classNames.pillCollapsed;
        pillCollapsedEl.textContent = collapsedStatusLabel;

        pillEl.appendChild(pillExpandedEl);
        pillEl.appendChild(pillCollapsedEl);

        let toggleEl = null;
        if (collapsible) {
          toggleEl = doc.createElement('span');
          toggleEl.className = classNames.toggle;

          const expandEl = doc.createElement('span');
          expandEl.className = classNames.toggleExpand;
          expandEl.textContent = expandLabel;

          const collapseEl = doc.createElement('span');
          collapseEl.className = classNames.toggleCollapse;
          collapseEl.textContent = collapseLabel;

          const chevronEl = doc.createElement('span');
          chevronEl.className = classNames.chevron;
          chevronEl.textContent = '▾';

          toggleEl.appendChild(expandEl);
          toggleEl.appendChild(collapseEl);
          toggleEl.appendChild(chevronEl);
        }

        header.appendChild(labelEl);
        header.appendChild(pathEl);
        header.appendChild(pillEl);
        if (toggleEl) {
          header.appendChild(toggleEl);
        }

        const body = doc.createElement('div');
        body.className = classNames.body;
        const range = doc.createRange();
        range.setStartAfter(startMarker);
        range.setEndBefore(endNode);
        body.appendChild(range.extractContents());

        const hintEl = doc.createElement('span');
        hintEl.className = classNames.hint;
        hintEl.textContent = hint;

        if (Number.isInteger(startMeta.sourceLine)) {
          _setSourceLineAttrs(block, startMeta.sourceLine, startMeta.sourceLineEnd);
          _setSourceLineAttrs(header, startMeta.sourceLine, startMeta.sourceLineEnd);
          _setSourceLineAttrs(body, startMeta.sourceLine, startMeta.sourceLineEnd);
        }

        block.appendChild(header);
        block.appendChild(body);
        block.appendChild(hintEl);

        parent.insertBefore(block, startMarker);

        if (removeMarkers) {
          startMarker.parentNode?.removeChild(startMarker);
          endNode.parentNode?.removeChild(endNode);
        }

        touched = true;
      });

      return {
        content: doc.body.innerHTML,
        meta: {
          touched,
        },
      };
    },
    config: {
      collapsible,
      defaultCollapsed,
      removeMarkers,
      classNames,
      statusLabel,
      collapsedStatusLabel,
      expandLabel,
      collapseLabel,
    },
  };
}

async function _expandIncludes(text, context, depth = 0, parentPath = null, anchorLine = null) {
  if (depth > context.maxDepth) {
    throw new Error('include.max-depth-exceeded');
  }

  const source = String(text ?? '');
  const includePattern = new RegExp(INCLUDE_DIRECTIVE_PATTERN.source, 'g');
  const matches = [...source.matchAll(includePattern)];
  if (!matches.length) return source;

  let output = '';
  let cursor = 0;

  for (const match of matches) {
    const fullMatch = match[0];
    const includePath = String(match[1] ?? '').trim();
    const from = Number.isFinite(match.index) ? match.index : 0;
    const isStandaloneLine = _isStandaloneDirectiveLine(source, from, fullMatch.length);
    const matchLine = _lineFromOffset(source, from);
    const sourceLine = Number.isInteger(anchorLine) ? anchorLine : matchLine;

    output += source.slice(cursor, from);

    if (!_isAllowedIncludePath(includePath, context.allowPaths)) {
      throw new Error(`include.path.denied:${includePath}`);
    }

    if (context.includeStack.includes(includePath)) {
      throw new Error(`include.circular-reference:${includePath}`);
    }

    if (context.signal?.aborted) {
      throw new Error('rule.aborted');
    }

    context.includeStack.push(includePath);
    const resolved = await context.resolveInclude(includePath, {
      path: includePath,
      parentPath,
      depth,
      signal: context.signal,
      renderVersion: context.renderVersion,
    });

    const expanded = await _expandIncludes(
      String(resolved ?? ''),
      context,
      depth + 1,
      includePath,
      sourceLine,
    );

    context.includeStack.pop();
    if (context.annotateIncludes) {
      const markerId = `include-${context.includeIdSeq++}`;
      const markerMeta = {
        id: markerId,
        path: includePath,
        sourceLine,
        sourceLineEnd: sourceLine,
        downstreamShift: 0,
      };

      let wrapped = `${_buildIncludeStartMarker(markerMeta)}\n\n${expanded}\n\n${_buildIncludeEndMarker(markerMeta)}`;
      let inserted = isStandaloneLine ? `\n${wrapped}\n` : wrapped;
      const downstreamShift = Math.max(0, _countLineBreaks(inserted) - _countLineBreaks(fullMatch));
      if (downstreamShift > 0) {
        markerMeta.downstreamShift = downstreamShift;
        wrapped = `${_buildIncludeStartMarker(markerMeta)}\n\n${expanded}\n\n${_buildIncludeEndMarker(markerMeta)}`;
        inserted = isStandaloneLine ? `\n${wrapped}\n` : wrapped;
      }

      output += inserted;
    } else {
      output += expanded;
    }
    cursor = from + fullMatch.length;
  }

  output += source.slice(cursor);
  return output;
}

function _buildIncludeStartMarker(meta) {
  const encoded = encodeURIComponent(JSON.stringify(meta)).replace(/"/g, '&quot;');
  return `<span data-se-include-start="${encoded}"></span>`;
}

function _buildIncludeEndMarker(meta) {
  return `<span data-se-include-end="${meta.id}"></span>`;
}

function _parseIncludeStartMarker(value) {
  const payload = String(value ?? '').trim();
  if (!payload) return null;

  try {
    const parsed = JSON.parse(decodeURIComponent(payload));
    if (!parsed || typeof parsed !== 'object') return null;
    if (typeof parsed.id !== 'string' || !parsed.id) return null;
    return {
      id: parsed.id,
      path: typeof parsed.path === 'string' ? parsed.path : '',
      sourceLine: Number.isInteger(parsed.sourceLine) ? parsed.sourceLine : null,
      sourceLineEnd: Number.isInteger(parsed.sourceLineEnd) ? parsed.sourceLineEnd : null,
      downstreamShift: Number.isInteger(parsed.downstreamShift) ? Math.max(0, parsed.downstreamShift) : null,
    };
  } catch {
    return null;
  }
}

function _parseIncludeEndMarker(value) {
  const id = String(value ?? '').trim();
  return id || null;
}

function _findIncludeEndNode(startNode, markerId) {
  const doc = startNode.ownerDocument;
  const root = doc?.body;
  if (!root) return null;

  const endCandidates = Array.from(root.querySelectorAll('[data-se-include-end]'));
  return endCandidates.find((candidate) => {
    const candidateId = _parseIncludeEndMarker(candidate.getAttribute('data-se-include-end') ?? '');
    if (candidateId !== markerId) return false;
    return Boolean(startNode.compareDocumentPosition(candidate) & Node.DOCUMENT_POSITION_FOLLOWING);
  }) ?? null;
}

function _collectElementsBetween(startNode, endNode) {
  const doc = startNode.ownerDocument;
  const root = doc?.body;
  if (!root) return [];

  const elements = Array.from(root.querySelectorAll('*'));
  return elements.filter((el) => {
    const startBeforeEl = Boolean(startNode.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING);
    const elBeforeEnd = Boolean(el.compareDocumentPosition(endNode) & Node.DOCUMENT_POSITION_FOLLOWING);
    return startBeforeEl && elBeforeEnd;
  });
}

function _setSourceLineAttrs(el, line, lineEnd) {
  if (!Number.isInteger(line)) return;
  el.setAttribute('data-source-line', String(line));
  el.setAttribute('data-source-line-end', String(Number.isInteger(lineEnd) ? lineEnd : line));
}

function _shiftSourceLineAttrs(el, delta) {
  if (!Number.isInteger(delta) || delta === 0) return;
  const sourceLine = parseInt(el.getAttribute('data-source-line') ?? '', 10);
  if (!Number.isInteger(sourceLine)) return;
  const sourceLineEnd = parseInt(el.getAttribute('data-source-line-end') ?? '', 10);
  const nextFrom = Math.max(0, sourceLine + delta);
  const nextTo = Number.isInteger(sourceLineEnd)
    ? Math.max(nextFrom, sourceLineEnd + delta)
    : nextFrom;
  el.setAttribute('data-source-line', String(nextFrom));
  el.setAttribute('data-source-line-end', String(nextTo));
}

function _getNodeSourceLine(node) {
  let current = node;
  while (current && current.nodeType === Node.ELEMENT_NODE) {
    const value = parseInt(current.getAttribute?.('data-source-line') ?? '', 10);
    if (Number.isInteger(value)) return value;
    current = current.parentElement;
  }
  return null;
}

function _isNodeAfter(node, referenceNode) {
  if (!node || !referenceNode) return false;
  return Boolean(referenceNode.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING);
}

function _isNodeStrictlyBetween(node, startNode, endNode) {
  if (!node || !startNode || !endNode) return false;
  const afterStart = Boolean(startNode.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING);
  const beforeEnd = Boolean(node.compareDocumentPosition(endNode) & Node.DOCUMENT_POSITION_FOLLOWING);
  return afterStart && beforeEnd;
}

function _lineFromOffset(text, offset) {
  const source = String(text ?? '');
  const safeOffset = Math.max(0, Math.min(source.length, Number.isFinite(offset) ? offset : 0));
  let line = 0;
  for (let i = 0; i < safeOffset; i += 1) {
    if (source.charCodeAt(i) === 10) line += 1;
  }
  return line;
}

function _countLineBreaks(text) {
  const value = String(text ?? '');
  let count = 0;
  for (let i = 0; i < value.length; i += 1) {
    if (value.charCodeAt(i) === 10) count += 1;
  }
  return count;
}

function _isStandaloneDirectiveLine(source, from, length) {
  if (!Number.isFinite(from) || !Number.isFinite(length) || length <= 0) return false;
  const value = String(source ?? '');
  const start = Math.max(0, Math.min(value.length, from));
  const end = Math.max(start, Math.min(value.length, start + length));

  const lineStart = value.lastIndexOf('\n', Math.max(0, start - 1)) + 1;
  const nextNewline = value.indexOf('\n', end);
  const lineEnd = nextNewline === -1 ? value.length : nextNewline;

  const lineText = value.slice(lineStart, lineEnd).trim();
  const directiveText = value.slice(start, end).trim();
  return lineText.length > 0 && lineText === directiveText;
}

function _isAllowedIncludePath(targetPath, allowPaths) {
  if (!targetPath) return false;

  const normalizedTarget = _normalizePath(targetPath);
  if (/^[a-zA-Z]:\//.test(normalizedTarget)) return false;
  if (normalizedTarget.startsWith('//')) return false;
  if (normalizedTarget.startsWith('/')) {
    return allowPaths.some((prefix) => normalizedTarget.startsWith(prefix));
  }

  if (!allowPaths.length) return true;
  return allowPaths.some((prefix) => normalizedTarget.startsWith(prefix.replace(/^\.\//, '')));
}

function _isRelativeSrc(src) {
  const value = String(src ?? '').trim();
  if (!value) return false;
  if (value.startsWith('#')) return false;
  if (value.startsWith('//')) return false;
  if (/^[a-zA-Z][a-zA-Z\d+.-]*:/.test(value)) return false;
  return true;
}

function _normalizePrefix(prefix) {
  const normalized = String(prefix ?? '').trim();
  if (!normalized) return '';
  return normalized.endsWith('/') ? normalized.slice(0, -1) : normalized;
}

function _joinPrefix(prefix, src) {
  const left = _normalizePrefix(prefix);
  const right = String(src ?? '').trim();
  if (!left || !right) return right;
  const normalizedRight = right.startsWith('/') ? right : `/${right}`;
  return `${left}${normalizedRight}`;
}

function _normalizePath(value) {
  return String(value ?? '').trim().replace(/\\/g, '/');
}

const INCLUDE_DIRECTIVE_TEST_PATTERN = /{%\s*include\s+"([^"\r\n]+)"\s*%}/;
const INCLUDE_DIRECTIVE_PATTERN = /{%\s*include\s+"([^"\r\n]+)"\s*%}/g;
