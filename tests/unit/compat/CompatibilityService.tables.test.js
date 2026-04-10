import { describe, expect, it } from 'vitest';
import { CompatibilityService } from '../../../src/core/compat/CompatibilityService.js';
import { TableCompatibilityRule } from '../../../src/core/compat/rules/TableCompatibilityRule.js';

const BROKEN_TABLE = [
  'Col A | Col B',
  '| -- | ---',
  '1 | 2 | 3',
  '| 4 | 5',
].join('\n');

const BROKEN_MARKDOWN = [
  '|  |  |',
  '| -- | -- |',
  '| 1 | 2 |',
  '',
  '- item',
  '* mixed marker',
  '   - bad indent',
  '1. one',
  '3. three',
  '- [maybe] task',
  '',
  '```',
  'const x = 1;',
  '~~~',
  '',
  '[Ref][missing-ref]',
  '[Empty]()',
].join('\n');

describe('CompatibilityService table rules', () => {
  it('reports all stable table compatibility issue codes', () => {
    const service = new CompatibilityService();
    const report = service.validate(BROKEN_TABLE);
    const codes = new Set(report.issues.map((issue) => issue.code));

    expect(codes.has('table.missing-leading-pipe')).toBe(true);
    expect(codes.has('table.missing-trailing-pipe')).toBe(true);
    expect(codes.has('table.column-count-mismatch')).toBe(true);
    expect(codes.has('table.invalid-separator-row')).toBe(true);
    expect(codes.has('table.separator-alignment-invalid')).toBe(true);
  });

  it('single issue fix applies only selected issue fix payload', () => {
    const rule = new TableCompatibilityRule();
    const report = rule.validate(BROKEN_TABLE);
    const target = report.issues.find((issue) => issue.code === 'table.missing-leading-pipe');

    expect(target).toBeTruthy();
    const afterSingleFix = rule.validate(target.fix.nextMarkdown);
    const remainingCodes = new Set(afterSingleFix.issues.map((issue) => issue.code));

    expect(remainingCodes.has('table.invalid-separator-row')).toBe(true);
    expect(remainingCodes.has('table.column-count-mismatch')).toBe(true);
  });

  it('batch fix normalizes all fixable table issues', () => {
    const service = new CompatibilityService();
    const fix = service.buildBatchFix(BROKEN_TABLE);

    expect(fix).toBeTruthy();
    const fixedReport = service.validate(fix.nextMarkdown);
    expect(fixedReport.summary.total).toBe(0);
  });

  it('reports new markdown compatibility issue families', () => {
    const service = new CompatibilityService();
    const report = service.validate(BROKEN_MARKDOWN);
    const codes = new Set(report.issues.map((issue) => issue.code));

    expect(codes.has('table.empty-header-row')).toBe(true);
    expect(codes.has('list.indentation-invalid')).toBe(true);
    expect(codes.has('list.mixed-marker-style')).toBe(true);
    expect(codes.has('list.ordered-sequence-broken')).toBe(true);
    expect(codes.has('list.task-marker-invalid')).toBe(true);
    expect(codes.has('fence.mismatched-delimiter')).toBe(true);
    expect(codes.has('link.reference-undefined')).toBe(true);
    expect(codes.has('link.destination-missing')).toBe(true);
  });

  it('marks unsafe fixes as per-issue only and excludes them from Fix all count', () => {
    const service = new CompatibilityService();
    const report = service.validate(BROKEN_MARKDOWN);

    const unsafeIssues = report.issues.filter((issue) => issue.fixSafety === 'unsafe');
    const safeIssues = report.issues.filter((issue) => issue.fixSafety !== 'unsafe' && issue.fixable);

    expect(unsafeIssues.length).toBeGreaterThan(0);
    expect(report.summary.fixable).toBe(safeIssues.length);
    expect(report.summary.fixableAll).toBe(report.issues.filter((issue) => issue.fixable).length);
  });

  it('reports mixed unordered list markers for the exact - + - pattern', () => {
    const service = new CompatibilityService();
    const markdown = ['- iojoij', '+ ijoij', '- oijoij'].join('\n');
    const report = service.validate(markdown);
    const mixedIssues = report.issues.filter((issue) => issue.code === 'list.mixed-marker-style');

    expect(report.status).toBe('warning');
    expect(mixedIssues).toHaveLength(1);
    expect(mixedIssues[0].lineFrom).toBe(1);
  });

  it('does not treat markdown link lists as invalid task lists', () => {
    const service = new CompatibilityService();
    const markdown = [
      '- [wepiofjweijf](http://example.com)',
      '- [owijfewoiefj](http://example.com)',
      '- [woepfjoiwjefoiwj](http://example.com)',
    ].join('\n');
    const report = service.validate(markdown);
    const taskIssues = report.issues.filter((issue) => issue.code === 'list.task-marker-invalid');

    expect(taskIssues).toHaveLength(0);
  });

  it('reports unescaped pipes inside table cells instead of only column mismatch noise', () => {
    const service = new CompatibilityService();
    const markdown = ['| A | B |', '| --- | --- |', '| foo | bar|baz |'].join('\n');
    const report = service.validate(markdown);
    const unescapedPipeIssues = report.issues.filter((issue) => issue.code === 'table.unescaped-pipe-in-cell');

    expect(unescapedPipeIssues).toHaveLength(1);
    expect(unescapedPipeIssues[0].lineFrom).toBe(2);
  });

  it('inserts unclosed fence fix after the first blank line following the opening fence', () => {
    const service = new CompatibilityService();
    const markdown = ['```', 'const x = 1;', '', 'after fence'].join('\n');
    const report = service.validate(markdown);
    const issue = report.issues.find((entry) => entry.code === 'fence.unclosed');

    expect(issue).toBeTruthy();
    expect(issue.fix.nextMarkdown).toBe(['```', 'const x = 1;', '', '```', 'after fence'].join('\n'));
  });

  it('batch fix inserts unclosed fence closing delimiter after the first blank line', () => {
    const service = new CompatibilityService();
    const markdown = ['```', 'const x = 1;', '', 'after fence'].join('\n');
    const fix = service.buildBatchFix(markdown);

    expect(fix).toBeTruthy();
    expect(fix.nextMarkdown).toBe(['```', 'const x = 1;', '', '```', 'after fence'].join('\n'));
  });

  it('normalizes mismatched fence delimiters to the opening fence length', () => {
    const service = new CompatibilityService();
    const markdown = ['```js', 'const x = 1;', '~~~~'].join('\n');
    const report = service.validate(markdown);
    const issue = report.issues.find((entry) => entry.code === 'fence.mismatched-delimiter');

    expect(issue).toBeTruthy();
    expect(issue.fix.nextMarkdown).toBe(['```js', 'const x = 1;', '```'].join('\n'));

    const batchFix = service.buildBatchFix(markdown);
    expect(batchFix).toBeTruthy();
    expect(batchFix.nextMarkdown).toBe(['```js', 'const x = 1;', '```'].join('\n'));
  });

  it('reports both undefined reference and missing destination for an empty inline link', () => {
    const service = new CompatibilityService();
    const markdown = '[]()';
    const report = service.validate(markdown);
    const codes = report.issues.map((issue) => issue.code);

    expect(codes.filter((code) => code === 'link.reference-undefined')).toHaveLength(1);
    expect(codes.filter((code) => code === 'link.destination-missing')).toHaveLength(1);
    expect(report.status).toBe('invalid');
  });

  it('reports the second fenced block as unclosed when its closing delimiter is missing', () => {
    const service = new CompatibilityService();
    const markdown = ['```js', 'console.log(1);', '```', '', '```js', 'console.log(2);', '', 'after fence'].join('\n');
    const report = service.validate(markdown);
    const issue = report.issues.find((entry) => entry.code === 'fence.unclosed');

    expect(issue).toBeTruthy();
    expect(issue.lineFrom).toBe(4);
    expect(issue.fix.nextMarkdown).toBe(['```js', 'console.log(1);', '```', '', '```js', 'console.log(2);', '', '```', 'after fence'].join('\n'));
  });

  it('batch fix applies safe changes and keeps unsafe link/table warnings for manual review', () => {
    const service = new CompatibilityService();
    const fix = service.buildBatchFix(BROKEN_MARKDOWN);

    expect(fix).toBeTruthy();
    const reportAfterBatch = service.validate(fix.nextMarkdown);
    const remainingCodes = new Set(reportAfterBatch.issues.map((issue) => issue.code));

    expect(remainingCodes.has('link.reference-undefined')).toBe(true);
    expect(remainingCodes.has('link.destination-missing')).toBe(true);
    expect(remainingCodes.has('table.empty-header-row')).toBe(true);
    expect(remainingCodes.has('fence.mismatched-delimiter')).toBe(false);
    expect(remainingCodes.has('list.indentation-invalid')).toBe(false);
  });

  it('reports list.indentation-invalid for OL item indented by 2 tabs (8 spaces) skipping a level', () => {
    const service = new CompatibilityService();
    // Two Tab presses on an OL item from level 0 = 8 spaces (ORDERED_LIST_INDENT = 4 spaces each).
    // This lands in the "code block zone" of element1 and breaks rendering.
    const markdown = ['1. element1', '        1. element2', '1. element3'].join('\n');
    const report = service.validate(markdown);
    const indentIssues = report.issues.filter((issue) => issue.code === 'list.indentation-invalid');

    expect(indentIssues).toHaveLength(1);
    expect(indentIssues[0].lineFrom).toBe(1);

    // Fix must normalize to 4 spaces (one valid OL step from root).
    const fixed = indentIssues[0].fix.nextMarkdown;
    expect(fixed).toBe(['1. element1', '    1. element2', '1. element3'].join('\n'));
  });

  it('reports list.indentation-invalid for UL item indented by 2 tabs (4 spaces) skipping a level', () => {
    const service = new CompatibilityService();
    // Two Tab presses on a UL item from level 0 = 4 spaces (BULLET_LIST_INDENT = 2 spaces each).
    // This produces unexpected single-level nesting (looks like 1 tab in preview).
    const markdown = ['- element1', '    - element2', '- element3'].join('\n');
    const report = service.validate(markdown);
    const indentIssues = report.issues.filter((issue) => issue.code === 'list.indentation-invalid');

    expect(indentIssues).toHaveLength(1);
    expect(indentIssues[0].lineFrom).toBe(1);

    // Fix must normalize to 2 spaces (one valid UL step from root).
    const fixed = indentIssues[0].fix.nextMarkdown;
    expect(fixed).toBe(['- element1', '  - element2', '- element3'].join('\n'));
  });
});
