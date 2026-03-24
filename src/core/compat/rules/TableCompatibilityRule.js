/**
 * Validates markdown table blocks and generates safe normalization fixes.
 */
export class TableCompatibilityRule {
  constructor() {
    this.id = 'table-compatibility';
  }

  /**
   * @param {string} markdown
   * @returns {{ issues: object[] }}
   */
  validate(markdown) {
    const lines = String(markdown ?? '').split('\n');
    const blocks = _collectTableBlocks(lines);
    const issues = [];

    blocks.forEach((block, index) => {
      const problems = _collectBlockProblems(block);
      if (!problems.length) return;

      const replacementLines = _normalizeBlock(block);
      const nextMarkdown = _replaceBlock(lines, block.startLine, block.endLine, replacementLines);
      const blockRange = _lineRangeToOffsets(lines, block.startLine, block.endLine);
      const newRange = _lineRangeToOffsets(nextMarkdown.split('\n'), block.startLine, block.startLine + replacementLines.length - 1);

      problems.forEach((problem, problemIndex) => {
        const lineRange = _lineRangeToOffsets(lines, problem.lineFrom, problem.lineTo);

        issues.push({
          id: `${this.id}-${index + 1}-${problemIndex + 1}`,
          code: problem.code,
          severity: 'error',
          message: problem.message,
          details: problem.details,
          lineFrom: problem.lineFrom,
          lineTo: problem.lineTo,
          from: lineRange.from,
          to: lineRange.to,
          fixable: true,
          fix: {
            id: `fix-${this.id}-${index + 1}-${problemIndex + 1}`,
            label: 'Fix table',
            description: 'Normalizes table markdown to an Eleventy-compatible shape.',
            nextMarkdown,
            highlightOld: blockRange,
            highlightNew: newRange,
          },
        });
      });
    });

    return { issues };
  }

  /**
   * @param {string} markdown
   * @returns {{ changed: boolean, nextMarkdown: string, changes: object[] }}
   */
  buildDocumentFix(markdown) {
    const lines = String(markdown ?? '').split('\n');
    const blocks = _collectTableBlocks(lines);
    if (!blocks.length) {
      return { changed: false, nextMarkdown: String(markdown ?? ''), changes: [] };
    }

    const nextLines = [...lines];
    const changes = [];
    let shift = 0;

    blocks.forEach((block, index) => {
      if (_isCanonicalBlock(block)) return;

      const normalizedLines = _normalizeBlock(block);
      const start = block.startLine + shift;
      const end = block.endLine + shift;
      const beforeLength = end - start + 1;

      nextLines.splice(start, beforeLength, ...normalizedLines);
      shift += normalizedLines.length - beforeLength;

      changes.push({
        id: `batch-${this.id}-${index + 1}`,
        lineFrom: start,
        lineTo: start + normalizedLines.length - 1,
      });
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

function _collectBlockProblems(block) {
  const parsedRows = block.lines.map((line, idx) => ({
    ..._parseRow(line),
    line: block.startLine + idx,
    rowIndex: idx,
  }));

  const expectedColumns = Math.max(...parsedRows.map((row) => row.cells.length));
  const problems = [];

  parsedRows.forEach((row) => {
    if (!row.hasLeadingPipe) {
      problems.push({
        code: 'table.missing-leading-pipe',
        message: 'Table row is missing a leading pipe (|).',
        details: `Row ${row.line + 1} should start with '|'.`,
        lineFrom: row.line,
        lineTo: row.line,
      });
    }

    if (!row.hasTrailingPipe) {
      problems.push({
        code: 'table.missing-trailing-pipe',
        message: 'Table row is missing a trailing pipe (|).',
        details: `Row ${row.line + 1} should end with '|'.`,
        lineFrom: row.line,
        lineTo: row.line,
      });
    }

    if (row.cells.length !== expectedColumns) {
      problems.push({
        code: 'table.column-count-mismatch',
        message: 'Table row has inconsistent number of columns.',
        details: `Row ${row.line + 1} has ${row.cells.length} columns, expected ${expectedColumns}.`,
        lineFrom: row.line,
        lineTo: row.line,
      });
    }

    if (row.rowIndex === 1 && !_isCanonicalSeparatorRow(row.cells)) {
      problems.push({
        code: 'table.invalid-separator-row',
        message: 'Table separator row uses invalid markdown syntax.',
        details: `Row ${row.line + 1} should use separator cells like '---', ':---', '---:', or ':---:'.`,
        lineFrom: row.line,
        lineTo: row.line,
      });
    }
  });

  return _dedupeProblems(problems);
}

function _collectTableBlocks(lines) {
  const blocks = [];

  for (let i = 0; i < lines.length - 1; i++) {
    const header = lines[i];
    const separator = lines[i + 1];
    if (!_looksLikeHeader(header) || !_looksLikeSeparator(separator)) continue;

    let end = i + 1;
    for (let j = i + 2; j < lines.length; j++) {
      if (!_looksLikeBodyRow(lines[j])) break;
      end = j;
    }

    blocks.push({
      startLine: i,
      endLine: end,
      lines: lines.slice(i, end + 1),
    });

    i = end;
  }

  return blocks;
}

function _looksLikeHeader(line) {
  return typeof line === 'string' && line.includes('|') && line.trim().length > 0;
}

function _looksLikeSeparator(line) {
  if (typeof line !== 'string') return false;
  const trimmed = line.trim();
  if (!trimmed.includes('-')) return false;
  return /^\|?[\s:-]+(?:\|[\s:-]+)+\|?$/.test(trimmed);
}

function _looksLikeBodyRow(line) {
  if (typeof line !== 'string') return false;
  const trimmed = line.trim();
  if (!trimmed) return false;
  return trimmed.includes('|');
}

function _isCanonicalBlock(block) {
  return _collectBlockProblems(block).length === 0;
}

function _normalizeBlock(block) {
  const parsedRows = block.lines.map((line) => _parseRow(line));
  const expectedColumns = Math.max(...parsedRows.map((row) => row.cells.length));

  return parsedRows.map((row, idx) => {
    const padded = _padCells(row.cells, expectedColumns);
    if (idx === 1) {
      const sepCells = padded.map((cell) => _normalizeSeparatorCell(cell));
      return `| ${sepCells.join(' | ')} |`;
    }

    return `| ${padded.map((cell) => cell.trim()).join(' | ')} |`;
  });
}

function _parseRow(line) {
  const raw = String(line ?? '');
  const trimmed = raw.trim();
  const hasLeadingPipe = trimmed.startsWith('|');
  const hasTrailingPipe = trimmed.endsWith('|');

  const core = trimmed
    .replace(/^\|/, '')
    .replace(/\|$/, '');

  const cells = core.split('|').map((cell) => cell.trim());

  return {
    hasLeadingPipe,
    hasTrailingPipe,
    cells,
  };
}

function _isCanonicalSeparatorRow(cells) {
  return cells.every((cell) => /^:?-{3,}:?$/.test(cell.trim()));
}

function _normalizeSeparatorCell(cell) {
  const compact = String(cell ?? '').replace(/\s+/g, '');
  const left = compact.startsWith(':');
  const right = compact.endsWith(':');
  return `${left ? ':' : ''}---${right ? ':' : ''}`;
}

function _padCells(cells, count) {
  const next = [...cells];
  while (next.length < count) next.push('');
  return next;
}

function _replaceBlock(lines, startLine, endLine, replacementLines) {
  const next = [...lines];
  next.splice(startLine, endLine - startLine + 1, ...replacementLines);
  return next.join('\n');
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
  for (let i = 0; i < lineIndex && i < lines.length; i++) {
    offset += lines[i].length + 1;
  }
  return offset;
}

function _dedupeProblems(problems) {
  const seen = new Set();
  return problems.filter((problem) => {
    const key = `${problem.code}|${problem.lineFrom}|${problem.lineTo}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
