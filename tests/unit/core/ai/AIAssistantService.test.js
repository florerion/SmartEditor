import { describe, expect, it, vi } from 'vitest';
import { AIAssistantService } from '../../../../src/core/ai/AIAssistantService.js';

describe('AIAssistantService', () => {
  it('normalizes request payload and returns provider response', async () => {
    const provider = {
      send: vi.fn().mockResolvedValue({
        text: 'ok',
        suggestedMarkdown: 'next',
      }),
    };

    const service = new AIAssistantService({ provider });
    const result = await service.execute({
      mode: 'rewrite-selection',
      markdown: '# Title',
      selection: {
        from: 1,
        to: 2,
        text: 'ab',
        lineFrom: 0,
        lineTo: 0,
      },
      instruction: 'Rewrite this',
    });

    expect(result).toEqual({
      mode: 'rewrite-selection',
      text: 'ok',
      suggestedMarkdown: 'next',
    });

    expect(provider.send).toHaveBeenCalledTimes(1);
    const [requestPayload] = provider.send.mock.calls[0];
    expect(requestPayload.language).toBe('pl');
  });

  it('reports provider as unavailable when probe throws', async () => {
    const service = new AIAssistantService({
      provider: {
        isAvailable: vi.fn().mockRejectedValue(new Error('offline')),
        send: vi.fn(),
      },
    });

    await expect(service.isAvailable()).resolves.toBe(false);
  });

  it('throws when execute is called without configured provider', async () => {
    const service = new AIAssistantService();
    service.setProvider(null);

    await expect(service.execute({ mode: 'chat', markdown: '', selection: {} })).rejects.toThrow(
      'AI provider is not configured',
    );
  });
});
