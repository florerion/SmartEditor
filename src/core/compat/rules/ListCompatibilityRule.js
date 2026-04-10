/**
 * Validates markdown list structures that commonly break rendering.
 */
export class ListCompatibilityRule {
  constructor() {
    this.id = 'list-compatibility';
  }

  /**
   * @param {string} markdown
   * @returns {{ issues: object[] }}
   */
  validate(markdown) {
    const lines = String(markdown ?? '').split('\n');
    const items = _collectListItems(lines);
    const issues = [];

    items.forEach((item, index) => {
      const isLevelJump = _isIndentLevelJump(items, index);
      if (item.hasTabIndent || item.indent % 2 !== 0 || isLevelJump) {
        const fixedLine = isLevelJump
          ? _normalizeIndentToTarget(item.raw, _computeTargetIndent(items, index))
          : _normalizeIndentLine(item.raw);
        issues.push(_buildIssue({
          id: `${this.id}-${issues.length + 1}`,
          code: 'list.indentation-invalid',
          severity: 'error',
          message: 'List item indentation is invalid.',
          details: `Line ${item.line + 1} uses inconsistent list indentation.`,
          line: item.line,
          fix: _buildLineReplacementFix(lines, item.line, fixedLine),
          fixSafety: 'safe',
        }));
      }

      if (item.isTask && !_isValidTaskMarker(item.text)) {
        issues.push(_buildIssue({
          id: `${this.id}-${issues.length + 1}`,
          code: 'list.task-marker-invalid',
          severity: 'error',
          message: 'Task list marker is invalid.',
          details: `Line ${item.line + 1} should use '[ ]' or '[x]' task markers.`,
          line: item.line,
          fix: _buildLineReplacementFix(lines, item.line, _normalizeTaskMarkerLine(item.raw)),
          fixSafety: 'safe',
        }));
      }

      if (item.type === 'unordered') {
        const expectedMarker = _expectedUnorderedMarker(items, index);
        if (expectedMarker && item.marker !== expectedMarker) {
          issues.push(_buildIssue({
            id: `${this.id}-${issues.length + 1}`,
            code: 'list.mixed-marker-style',
            severity: 'warning',
            message: 'Mixed unordered list markers detected.',
            details: `Line ${item.line + 1} mixes '${item.marker}' with '${expectedMarker}' at the same nesting level.`,
            line: item.line,
            fix: _buildLineReplacementFix(lines, item.line, _replaceMarker(item.raw, expectedMarker)),
            fixSafety: 'safe',
          }));
        }
      }

      if (item.type === 'ordered') {
        const expectedNumber = _expectedOrderedNumber(items, index);
        if (expectedNumber != null && item.number !== expectedNumber) {
          issues.push(_buildIssue({
            id: `${this.id}-${issues.length + 1}`,
            code: 'list.ordered-sequence-broken',
            severity: 'warning',
            message: 'Ordered list numbering is not sequential.',
            details: `Line ${item.line + 1} should use '${expectedNumber}.' for consistent numbering.`,
            line: item.line,
            fix: _buildLineReplacementFix(lines, item.line, _replaceOrderedNumber(item.raw, expectedNumber)),
            fixSafety: 'safe',
          }));
        }
      }
    });

    return { issues };
  }

  /**
   * @param {string} markdown
   * @returns {{ changed: boolean, nextMarkdown: string, changes: object[] }}
   */
  buildDocumentFix(markdown) {
    const lines = String(markdown ?? '').split('\n');
    const nextLines = [...lines];
    const items = _collectListItems(nextLines);
    const changes = [];

    items.forEach((item, index) => {
      let nextLine = nextLines[item.line];

      const isLevelJump = _isIndentLevelJump(items, index);
      if (item.hasTabIndent || item.indent % 2 !== 0 || isLevelJump) {
        nextLine = isLevelJump
          ? _normalizeIndentToTarget(nextLine, _computeTargetIndent(items, index))
          : _normalizeIndentLine(nextLine);
      }

      const expectedMarker = item.type === 'unordered' ? _expectedUnorderedMarker(items, index) : null;
      if (expectedMarker && item.marker !== expectedMarker) {
        nextLine = _replaceMarker(nextLine, expectedMarker);
      }

      const expectedNumber = item.type === 'ordered' ? _expectedOrderedNumber(items, index) : null;
      if (expectedNumber != null && item.number !== expectedNumber) {
        nextLine = _replaceOrderedNumber(nextLine, expectedNumber);
      }

      if (item.isTask && !_isValidTaskMarker(item.text)) {
        nextLine = _normalizeTaskMarkerLine(nextLine);
      }

      if (nextLine !== nextLines[item.line]) {
        nextLines[item.line] = nextLine;
        changes.push({ id: `batch-${this.id}-${changes.length + 1}`, lineFrom: item.line, lineTo: item.line });
      }
    });

    if (!changes.length) {
      return { changed: false, nextMarkdown: String(markdown ?? ''), changes: [] };
    }

    return {
      changed: true,
      nextMarkdown: nextLines.join('\n'),
      changes,
    };
  }
}

function _collectListItems(lines) {
  const items = [];
  lines.forEach((line, lineIndex) => {
    const match = String(line ?? '').match(/^(\s*)([-+*]|\d+\.)\s+(.*)$/);
    if (!match) return;

    const indentRaw = match[1] ?? '';
    const marker = match[2] ?? '';
    const text = match[3] ?? '';
    const hasTabIndent = indentRaw.includes('\t');
    const normalizedIndent = indentRaw.replaceAll('\t', '  ').length;

    items.push({
      line: lineIndex,
      raw: line,
      indent: normalizedIndent,
      hasTabIndent,
      marker,
      type: /\d+\./.test(marker) ? 'ordered' : 'unordered',
      number: /\d+\./.test(marker) ? Number.parseInt(marker, 10) : null,
      text,
      isTask: _looksLikeTaskMarkerStart(text),
    });
  });

  return items;
}

function _looksLikeTaskMarkerStart(text) {
  return /^\[[^\]]*\](?:\s|$)/.test(String(text ?? ''));
}

function _expectedUnorderedMarker(items, index) {
  const item = items[index];
  if (!item || item.type !== 'unordered') return null;

  let canonicalMarker = item.marker;

  for (let i = index; i >= 0; i -= 1) {
    const current = items[i];
    if (current.indent !== item.indent) continue;
    if (current.type !== 'unordered') continue;
    if (i < index && items[i + 1].line - current.line > 1) break;
    canonicalMarker = current.marker;
  }

  return canonicalMarker;
}

function _expectedOrderedNumber(items, index) {
  const item = items[index];
  if (!item || item.type !== 'ordered') return null;

  for (let i = index - 1; i >= 0; i -= 1) {
    const prev = items[i];
    if (prev.indent !== item.indent) continue;
    if (prev.type !== 'ordered') continue;
    if (item.line - prev.line > 1) break;
    return (prev.number ?? 0) + 1;
  }

  return item.number;
}

function _isValidTaskMarker(text) {
  return /^\[(?: |x|X)\]\s+/.test(String(text ?? ''));
}

function _normalizeIndentLine(line) {
  const match = String(line ?? '').match(/^(\s*)(.*)$/);
  const indent = (match?.[1] ?? '').replaceAll('\t', '  ');
  const rest = match?.[2] ?? '';
  const normalizedLength = indent.length % 2 === 0 ? indent.length : indent.length + 1;
  return `${' '.repeat(normalizedLength)}${rest}`;
}

/**
 * Sets the leading whitespace to exactly `targetIndent` spaces.
 * Used when a level-jump fix needs to collapse excessive indentation.
 * @param {string} line
 * @param {number} targetIndent
 * @returns {string}
 */
function _normalizeIndentToTarget(line, targetIndent) {
  const match = String(line ?? '').match(/^(\s*)(.*)$/);
  const rest = match?.[2] ?? '';
  return `${' '.repeat(targetIndent)}${rest}`;
}

/**
 * Returns true when a list item's indent depth skips more than one nesting
 * level beyond its nearest ancestor.  The allowed step is determined by the
 * ancestor's list type: 4 spaces for ordered lists, 2 for unordered.
 * @param {object[]} items
 * @param {number} index
 * @returns {boolean}
 */
function _isIndentLevelJump(items, index) {
  const item = items[index];
  if (item.indent === 0) return false;

  // Locate nearest preceding item with a strictly lower indent level.
  let parentIndent = null;
  let parentType = null;
  for (let i = index - 1; i >= 0; i -= 1) {
    const prev = items[i];
    if (prev.indent < item.indent) {
      parentIndent = prev.indent;
      parentType = prev.type;
      break;
    }
  }

  if (parentIndent === null) {
    // No ancestor found — item must be at most one step from root level.
    const step = item.type === 'ordered' ? 4 : 2;
    return item.indent > step;
  }

  const parentStep = parentType === 'ordered' ? 4 : 2;
  return item.indent > parentIndent + parentStep;
}

/**
 * Computes the target indent (in spaces) for a level-jump fix: one step
 * deeper than the nearest ancestor.
 * @param {object[]} items
 * @param {number} index
 * @returns {number}
 */
function _computeTargetIndent(items, index) {
  const item = items[index];

  let parentIndent = null;
  let parentType = null;
  for (let i = index - 1; i >= 0; i -= 1) {
    const prev = items[i];
    if (prev.indent < item.indent) {
      parentIndent = prev.indent;
      parentType = prev.type;
      break;
    }
  }

  if (parentIndent === null) {
    return item.type === 'ordered' ? 4 : 2;
  }

  const parentStep = parentType === 'ordered' ? 4 : 2;
  return parentIndent + parentStep;
}

function _normalizeTaskMarkerLine(line) {
  return String(line ?? '').replace(/^(\s*(?:[-+*]|\d+\.)\s+)\[[^\]]*\](\s*)/, '$1[ ] ');
}

function _replaceMarker(line, marker) {
  return String(line ?? '').replace(/^(\s*)[-+*](\s+)/, `$1${marker}$2`);
}

function _replaceOrderedNumber(line, number) {
  return String(line ?? '').replace(/^(\s*)\d+(\.\s+)/, `$1${number}$2`);
}

function _buildIssue(payload) {
  const { id, code, severity, message, details, line, fix, fixSafety } = payload;
  return {
    id,
    code,
    severity,
    message,
    details,
    lineFrom: line,
    lineTo: line,
    from: fix.highlightOld.from,
    to: fix.highlightOld.to,
    fixable: true,
    fixSafety,
    fix,
  };
}

function _buildLineReplacementFix(lines, lineIndex, nextLine) {
  const nextLines = [...lines];
  nextLines[lineIndex] = nextLine;
  return {
    id: `fix-list-${lineIndex + 1}`,
    label: 'Fix issue',
    description: 'Normalizes the list markdown for this issue.',
    nextMarkdown: nextLines.join('\n'),
    highlightOld: _lineRangeToOffsets(lines, lineIndex, lineIndex),
    highlightNew: _lineRangeToOffsets(nextLines, lineIndex, lineIndex),
  };
}

function _lineRangeToOffsets(lines, startLine, endLine) {
  const from = _offsetForLine(lines, startLine);
  const toLineStart = _offsetForLine(lines, Math.min(endLine + 1, lines.length));
  const to = toLineStart > 0 ? toLineStart - 1 : from;
  return { from, to };
}

function _offsetForLine(lines, lineIndex) {
  if (lineIndex <= 0) return 0;
  let offset = 0;
  for (let i = 0; i < lineIndex && i < lines.length; i += 1) {
    offset += lines[i].length + 1;
  }
  return offset;
}
