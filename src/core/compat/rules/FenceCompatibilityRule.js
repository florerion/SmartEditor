/**
 * Validates fenced code blocks for structural markdown issues.
 */
export class FenceCompatibilityRule {
  constructor() {
    this.id = 'fence-compatibility';
  }

  /**
   * @param {string} markdown
   * @returns {{ issues: object[] }}
   */
  validate(markdown) {
    const lines = String(markdown ?? '').split('\n');
    const issues = [];
    let openFence = null;

    lines.forEach((line, lineIndex) => {
      const fence = openFence ? _matchClosingFence(line) : _matchOpeningFence(line);
      if (!fence) return;

      if (!openFence) {
        openFence = {
          line: lineIndex,
          indent: fence.indent,
          marker: fence.marker,
          length: fence.length,
        };
        return;
      }

      if (fence.marker !== openFence.marker) {
        issues.push(_buildIssue({
          id: `${this.id}-${issues.length + 1}`,
          code: 'fence.mismatched-delimiter',
          severity: 'error',
          message: 'Code fence closes with a different delimiter.',
          details: `Fence opened with '${openFence.marker.repeat(openFence.length)}' but closed with '${fence.marker.repeat(fence.length)}'.`,
          line: lineIndex,
          fix: _buildLineReplacementFix(lines, lineIndex, `${fence.indent}${openFence.marker.repeat(openFence.length)}`),
          fixSafety: 'safe',
        }));
        openFence = null;
        return;
      }

      if (fence.length < openFence.length) {
        issues.push(_buildIssue({
          id: `${this.id}-${issues.length + 1}`,
          code: 'fence.length-too-short-to-close',
          severity: 'error',
          message: 'Code fence closing delimiter is shorter than opening delimiter.',
          details: `Opening fence length is ${openFence.length}, closing fence length is ${fence.length}.`,
          line: lineIndex,
          fix: _buildLineReplacementFix(lines, lineIndex, `${fence.indent}${openFence.marker.repeat(openFence.length)}`),
          fixSafety: 'safe',
        }));
        openFence = null;
        return;
      }

      openFence = null;
    });

    if (openFence) {
      const closingLine = `${openFence.indent}${openFence.marker.repeat(openFence.length)}`;
      const insertLine = _findUnclosedFenceInsertLine(lines, openFence.line);
      issues.push(_buildIssue({
        id: `${this.id}-${issues.length + 1}`,
        code: 'fence.unclosed',
        severity: 'error',
        message: 'Code fence is not closed.',
        details: `Fence opened at line ${openFence.line + 1} has no matching closing delimiter.`,
        line: openFence.line,
        fix: _buildInsertLineFix(lines, insertLine, closingLine),
        fixSafety: 'safe',
      }));
    }

    return { issues };
  }

  /**
   * @param {string} markdown
   * @returns {{ changed: boolean, nextMarkdown: string, changes: object[] }}
   */
  buildDocumentFix(markdown) {
    const lines = String(markdown ?? '').split('\n');
    const nextLines = [...lines];
    const changes = [];
    let openFence = null;

    for (let i = 0; i < nextLines.length; i += 1) {
      const fence = openFence ? _matchClosingFence(nextLines[i]) : _matchOpeningFence(nextLines[i]);
      if (!fence) continue;

      if (!openFence) {
        openFence = {
          line: i,
          indent: fence.indent,
          marker: fence.marker,
          length: fence.length,
        };
        continue;
      }

      if (fence.marker !== openFence.marker) {
        nextLines[i] = `${fence.indent}${openFence.marker.repeat(openFence.length)}`;
        changes.push({ id: `batch-${this.id}-${changes.length + 1}`, lineFrom: i, lineTo: i });
        openFence = null;
        continue;
      }

      if (fence.length < openFence.length) {
        nextLines[i] = `${fence.indent}${openFence.marker.repeat(openFence.length)}`;
        changes.push({ id: `batch-${this.id}-${changes.length + 1}`, lineFrom: i, lineTo: i });
        openFence = null;
        continue;
      }

      openFence = null;
    }

    if (openFence) {
      const insertLine = _findUnclosedFenceInsertLine(nextLines, openFence.line);
      nextLines.splice(insertLine, 0, `${openFence.indent}${openFence.marker.repeat(openFence.length)}`);
      changes.push({ id: `batch-${this.id}-${changes.length + 1}`, lineFrom: insertLine, lineTo: insertLine });
    }

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

function _matchOpeningFence(line) {
  const match = String(line ?? '').match(/^(\s*)(`{3,}|~{3,})(.*)$/);
  if (!match) return null;
  return {
    indent: match[1] ?? '',
    marker: match[2][0],
    length: match[2].length,
  };
}

function _matchClosingFence(line) {
  const match = String(line ?? '').match(/^(\s*)(`{3,}|~{3,})[ \t]*$/);
  if (!match) return null;
  return {
    indent: match[1] ?? '',
    marker: match[2][0],
    length: match[2].length,
  };
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
    id: `fix-fence-${lineIndex + 1}`,
    label: 'Fix issue',
    description: 'Normalizes the fence delimiter for this block.',
    nextMarkdown: nextLines.join('\n'),
    highlightOld: _lineRangeToOffsets(lines, lineIndex, lineIndex),
    highlightNew: _lineRangeToOffsets(nextLines, lineIndex, lineIndex),
  };
}

function _buildInsertLineFix(lines, lineIndex, insertedLine) {
  const nextLines = [...lines];
  nextLines.splice(lineIndex, 0, insertedLine);
  const insertionOffset = _offsetForLine(lines, lineIndex);
  return {
    id: `fix-fence-insert-${lineIndex + 1}`,
    label: 'Fix issue',
    description: 'Adds the missing closing fence delimiter.',
    nextMarkdown: nextLines.join('\n'),
    highlightOld: { from: insertionOffset, to: insertionOffset },
    highlightNew: _lineRangeToOffsets(nextLines, lineIndex, lineIndex),
  };
}

function _findUnclosedFenceInsertLine(lines, openFenceLine) {
  for (let i = openFenceLine + 1; i < lines.length; i += 1) {
    if (/^\s*$/.test(lines[i])) {
      return i + 1;
    }
  }

  return lines.length;
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
