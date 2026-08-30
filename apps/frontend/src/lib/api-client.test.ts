// Phase 7 (T7.5–T7.8): the transport layer, tested against a mocked global
// fetch — no real network, no real backend needed.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient, ApiClientError, clearTokens, setTokens } from './api-client';

function jsonResponse(status: number, body: unknown): Response {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: async () => body,
  } as Response;
}

beforeEach(() => {
  clearTokens();
  process.env.NEXT_PUBLIC_API_URL = 'http://localhost:4000/api';
});

describe('apiClient success/error unwrapping (T7.5, T7.6)', () => {
  it('T7.5: unwraps {success:true,data} and returns data', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse(200, { success: true, data: { hello: 'world' } }));
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await apiClient.get<{ hello: string }>('/ping');
    expect(result).toEqual({ hello: 'world' });
  });

  it('T7.6: throws a typed ApiClientError carrying code and message on {success:false,...}', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(400, {
        success: false,
        error: { code: 'BAD_REQUEST', message: 'Name is required', details: [{ path: 'name' }] },
      }),
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(apiClient.get('/ping')).rejects.toMatchObject({
      code: 'BAD_REQUEST',
      message: 'Name is required',
    });

    global.fetch = fetchMock as unknown as typeof fetch;
    const err = await apiClient.get('/ping').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiClientError);
  });
});

describe('apiClient Authorization header (T7.8)', () => {
  it('attaches the header when a token exists and omits it when not', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { success: true, data: null }));
    global.fetch = fetchMock as unknown as typeof fetch;

    await apiClient.get('/no-token');
    const [, optionsWithoutToken] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((optionsWithoutToken.headers as Headers).has('Authorization')).toBe(false);

    setTokens({ accessToken: 'abc123', refreshToken: 'refresh123' });
    await apiClient.get('/with-token');
    const [, optionsWithToken] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect((optionsWithToken.headers as Headers).get('Authorization')).toBe('Bearer abc123');
  });
});

describe('apiClient network failure (Phase 8, T8.10)', () => {
  it('wraps a raw fetch rejection in a typed ApiClientError instead of throwing/hanging', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    global.fetch = fetchMock as unknown as typeof fetch;

    const err = await apiClient.get('/ping').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiClientError);
    expect((err as ApiClientError).code).toBe('NETWORK_ERROR');
  });
});

describe('apiClient refresh-and-retry on 401 (T7.7)', () => {
  it('refreshes once, retries with the new token, and succeeds', async () => {
    setTokens({ accessToken: 'expired-token', refreshToken: 'valid-refresh' });

    const fetchMock = vi.fn();
    fetchMock.mockResolvedValueOnce(
      jsonResponse(401, { success: false, error: { code: 'UNAUTHORIZED', message: 'Expired' } }),
    );
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, {
        success: true,
        data: { accessToken: 'new-token', refreshToken: 'new-refresh' },
      }),
    );
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { success: true, data: { ok: true } }));
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await apiClient.get<{ ok: boolean }>('/protected');

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect((fetchMock.mock.calls[1] as [string])[0]).toContain('/auth/refresh');
    const retriedHeaders = (fetchMock.mock.calls[2] as [string, RequestInit])[1]
      .headers as Headers;
    expect(retriedHeaders.get('Authorization')).toBe('Bearer new-token');
  });

  it('does not loop when the retried request is also 401', async () => {
    setTokens({ accessToken: 'expired-token', refreshToken: 'valid-refresh' });

    const fetchMock = vi.fn();
    fetchMock.mockResolvedValueOnce(
      jsonResponse(401, { success: false, error: { code: 'UNAUTHORIZED', message: 'Expired' } }),
    );
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, {
        success: true,
        data: { accessToken: 'new-token', refreshToken: 'new-refresh' },
      }),
    );
    fetchMock.mockResolvedValueOnce(
      jsonResponse(401, { success: false, error: { code: 'UNAUTHORIZED', message: 'Still no' } }),
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(apiClient.get('/protected')).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    // Exactly 3 calls total: original, one refresh, one retry — never a second refresh.
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('surfaces the original 401 without retrying when the refresh call itself fails', async () => {
    setTokens({ accessToken: 'expired-token', refreshToken: 'invalid-refresh' });

    const fetchMock = vi.fn();
    fetchMock.mockResolvedValueOnce(
      jsonResponse(401, { success: false, error: { code: 'UNAUTHORIZED', message: 'Expired' } }),
    );
    fetchMock.mockResolvedValueOnce(
      jsonResponse(401, {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Bad refresh token' },
      }),
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(apiClient.get('/protected')).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
      message: 'Expired',
    });
    // Original request + the failed refresh attempt — no retry was made.
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
