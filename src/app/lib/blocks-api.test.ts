import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { blocksApi } from './blocks-api';

describe('blocksApi', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('blockedUsers solicita la lista de bloqueados con limit y cursor', async () => {
    const mockData = { items: [], nextCursor: null };
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(mockData), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const res = await blocksApi.blockedUsers('cur-1', 10);
    expect(res).toEqual(mockData);

    const [url, init] = vi.mocked(fetch).mock.calls[0]!;
    expect(String(url)).toContain('/blocks?limit=10&cursor=cur-1');
    expect(init?.method).toBe('GET');
  });

  it('block envía POST a /users/:userId/block', async () => {
    const mockRes = { blocked: true, blockedAt: '2026-10-06T12:00:00Z' };
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(mockRes), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const res = await blocksApi.block('target-uuid');
    expect(res).toEqual(mockRes);

    const [url, init] = vi.mocked(fetch).mock.calls[0]!;
    expect(String(url)).toContain('/users/target-uuid/block');
    expect(init?.method).toBe('POST');
  });

  it('unblock envía DELETE a /users/:userId/block', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(null, {
        status: 204,
      }),
    );

    await blocksApi.unblock('target-uuid');

    const [url, init] = vi.mocked(fetch).mock.calls[0]!;
    expect(String(url)).toContain('/users/target-uuid/block');
    expect(init?.method).toBe('DELETE');
  });
});
