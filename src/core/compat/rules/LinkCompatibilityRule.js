/**
 * Validates common markdown link issues.
 */
export class LinkCompatibilityRule {
  constructor() {
    this.id = 'link-compatibility';
  }

  /**
   * @param {string} markdown
   * @returns {{ issues: object[] }}
   */
  validate(markdown) {
    const source = String(markdown ?? '');
    const lines = source.split('\n');
    const issues = [];
    const referenceDefinitions = _collectReferenceDefinitions(lines);

    lines.forEach((line, lineIndex) => {
      const explicitRefs = [...line.matchAll(/\[([^\]]+)\]\[([^\]]+)\]/g)];
      explicitRefs.forEach((match) => {
        const referenceId = (match[2] ?? '').trim().toLowerCase();
        if (!referenceId || referenceDefinitions.has(referenceId)) return;
        issues.push(_buildIssue({
          id: `${this.id}-${issues.length + 1}`,
          code: 'link.reference-undefined',
          severity: 'warning',
          message: 'Link reference target is undefined.',
          details: `Reference '${match[2]}' on line ${lineIndex + 1} is missing a definition.`,
          line: lineIndex,
          fix: _buildAppendReferenceFix(lines, match[2]),
          fixSafety: 'unsafe',
        }));
      });

      const inlineLinks = [...line.matchAll(/\[([^\]]*)\]\(([^)]*)\)/g)];
      inlineLinks.forEach((match) => {
        if ((match[1] ?? '').trim().length === 0) {
          issues.push(_buildIssue({
            id: `${this.id}-${issues.length + 1}`,
            code: 'link.reference-undefined',
            severity: 'warning',
            message: 'Link reference target is undefined.',
            details: `Inline link on line ${lineIndex + 1} is missing link text.` ,
            line: lineIndex,
            fix: _buildInlineLabelFix(lines, lineIndex, match.index ?? 0, match[0], match[2]),
            fixSafety: 'unsafe',
          }));
        }

        if ((match[2] ?? '').trim().length > 0) return;
        issues.push(_buildIssue({
          id: `${this.id}-${issues.length + 1}`,
          code: 'link.destination-missing',
          severity: 'error',
          message: 'Inline link destination is missing.',
          details: `Link '${match[1]}' on line ${lineIndex + 1} has an empty destination.`,
          line: lineIndex,
          fix: _buildInlineDestinationFix(lines, lineIndex, match.index ?? 0, match[0], match[1]),
          fixSafety: 'unsafe',
        }));
      });
    });

    return { issues };
  }
}

function _collectReferenceDefinitions(lines) {
  const references = new Set();
  lines.forEach((line) => {
    const match = String(line ?? '').match(/^\s{0,3}\[([^\]]+)\]:\s+.+$/);
    if (!match) return;
    references.add(match[1].trim().toLowerCase());
  });
  return references;
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

function _buildInlineDestinationFix(lines, lineIndex, startIndex, fullMatch, label) {
  const oldLine = lines[lineIndex] ?? '';
  const nextLine = `${oldLine.slice(0, startIndex)}[${label}](https://example.com)${oldLine.slice(startIndex + fullMatch.length)}`;
  const nextLines = [...lines];
  nextLines[lineIndex] = nextLine;

  return {
    id: `fix-link-inline-${lineIndex + 1}-${startIndex + 1}`,
    label: 'Fix issue',
    description: 'Adds a placeholder destination to the inline link.',
    nextMarkdown: nextLines.join('\n'),
    highlightOld: _lineRangeToOffsets(lines, lineIndex, lineIndex),
    highlightNew: _lineRangeToOffsets(nextLines, lineIndex, lineIndex),
  };
}

function _buildInlineLabelFix(lines, lineIndex, startIndex, fullMatch, destination) {
  const oldLine = lines[lineIndex] ?? '';
  const safeDestination = String(destination ?? '').trim();
  const nextLine = `${oldLine.slice(0, startIndex)}[link](${safeDestination})${oldLine.slice(startIndex + fullMatch.length)}`;
  const nextLines = [...lines];
  nextLines[lineIndex] = nextLine;

  return {
    id: `fix-link-label-${lineIndex + 1}-${startIndex + 1}`,
    label: 'Fix issue',
    description: 'Adds placeholder link text to the inline link.',
    nextMarkdown: nextLines.join('\n'),
    highlightOld: _lineRangeToOffsets(lines, lineIndex, lineIndex),
    highlightNew: _lineRangeToOffsets(nextLines, lineIndex, lineIndex),
  };
}

function _buildAppendReferenceFix(lines, referenceId) {
  const normalizedId = String(referenceId ?? '').trim() || 'ref';
  const nextLines = [...lines];
  if (nextLines.length > 0 && nextLines[nextLines.length - 1].trim().length > 0) {
    nextLines.push('');
  }
  nextLines.push(`[${normalizedId}]: https://example.com`);

  const appendedLine = nextLines.length - 1;
  return {
    id: `fix-link-reference-${normalizedId.toLowerCase()}`,
    label: 'Fix issue',
    description: 'Adds a placeholder definition for the missing link reference.',
    nextMarkdown: nextLines.join('\n'),
    highlightOld: _lineRangeToOffsets(lines, Math.max(lines.length - 1, 0), Math.max(lines.length - 1, 0)),
    highlightNew: _lineRangeToOffsets(nextLines, appendedLine, appendedLine),
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
