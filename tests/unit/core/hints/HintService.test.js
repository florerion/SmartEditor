import { describe, expect, it, vi } from 'vitest';
import { HintRegistry } from '../../../../src/core/hints/HintRegistry.js';
import { HintService } from '../../../../src/core/hints/HintService.js';

function createRegistry() {
  return new HintRegistry([
    { id: 'hint-a', text: 'A', contexts: ['x'], priority: 10 },
    { id: 'hint-b', text: 'B', contexts: ['x', 'y'], priority: 10 },
    { id: 'hint-c', text: 'C', contexts: ['x', 'y'], priority: 20 },
  ]);
}

describe('HintService', () => {
  it('selects the top matching hint deterministically in first mode', () => {
    const registry = createRegistry();
    const service = new HintService(registry, {
      matchSelection: 'first',
      noMatchFallback: 'none',
      debounceMs: 0,
    });
    const events = [];
    service.onChange((payload) => events.push(payload));

    service.trigger(['x', 'y'], { source: 'test' });

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('show');
    expect(events[0].hint.id).toBe('hint-c');

    service.destroy();
  });

  it('emits clear when no match and fallback is disabled', () => {
    const registry = createRegistry();
    const service = new HintService(registry, {
      matchSelection: 'first',
      noMatchFallback: 'none',
      debounceMs: 0,
    });
    const events = [];
    service.onChange((payload) => events.push(payload));

    service.trigger(['missing'], { source: 'test' });

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ type: 'clear', reason: 'no-match-none' });

    service.destroy();
  });

  it('debounces context updates but keeps trigger immediate', () => {
    vi.useFakeTimers();

    const registry = createRegistry();
    const service = new HintService(registry, {
      matchSelection: 'first',
      noMatchFallback: 'none',
      debounceMs: 120,
    });
    const events = [];
    service.onChange((payload) => events.push(payload));

    service.setContext(['x'], { source: 'editor' });
    expect(events).toHaveLength(0);

    vi.advanceTimersByTime(120);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('show');

    service.trigger(['x', 'y'], { source: 'keyboard' });
    expect(events).toHaveLength(2);
    expect(events[1].type).toBe('show');

    service.destroy();
    vi.useRealTimers();
  });
});
