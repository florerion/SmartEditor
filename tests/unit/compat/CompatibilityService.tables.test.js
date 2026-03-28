import { describe, expect, it } from 'vitest';
import { CompatibilityService } from '../../../src/core/compat/CompatibilityService.js';
import { TableCompatibilityRule } from '../../../src/core/compat/rules/TableCompatibilityRule.js';

const BROKEN_TABLE = [
  'Col A | Col B',
  '| -- | ---',
  '1 | 2 | 3',
  '| 4 | 5',
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
});
