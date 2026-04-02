import { describe, expect, it } from 'vitest';
import { PromptRegistry } from '../../../../src/core/ai/PromptRegistry.js';

describe('PromptRegistry', () => {
  it('builds default review prompt plan with JSON requirement', () => {
    const registry = new PromptRegistry();

    const plan = registry.buildPromptPlan({
      mode: 'review-document',
      markdown: '# Doc',
      selection: { text: '' },
      language: 'en',
    });

    expect(plan.mode).toBe('review-document');
    expect(plan.wantsJson).toBe(true);
    expect(plan.messages).toHaveLength(2);
    expect(plan.messages[1].content).toContain('Return strict JSON');
  });

  it('allows overriding mode prompt logic', () => {
    const registry = new PromptRegistry();
    registry.registerMode('chat', {
      wantsJson: false,
      buildUserPrompt: (ctx) => `CUSTOM CHAT :: ${ctx.instruction || 'none'}`,
    });

    const plan = registry.buildPromptPlan({
      mode: 'chat',
      instruction: 'hello',
      markdown: '',
      selection: { text: '' },
      language: 'pl',
    });

    expect(plan.wantsJson).toBe(false);
    expect(plan.messages[1].content).toContain('CUSTOM CHAT :: hello');
  });
});
