import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  authMock,
  getUserGatewayApiKeyByGatewayIdMock,
  markUserGatewayApiKeyRevokedMock,
} = vi.hoisted(() => ({
  authMock: vi.fn(),
  getUserGatewayApiKeyByGatewayIdMock: vi.fn(),
  markUserGatewayApiKeyRevokedMock: vi.fn(),
}));

vi.mock('@/app/(auth)/auth', () => ({
  auth: authMock,
}));

vi.mock('@/lib/code-gateway/api-keys-db', () => ({
  getUserGatewayApiKeyByGatewayId: getUserGatewayApiKeyByGatewayIdMock,
  markUserGatewayApiKeyRevoked: markUserGatewayApiKeyRevokedMock,
}));

import { DELETE } from './route';

describe('/api/keys/[gatewayKeyId]', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.resetAllMocks();
    process.env.CODE_GATEWAY_URL = 'https://gateway.example';
    process.env.CODE_GATEWAY_ADMIN_TOKEN = 'admin-token';
  });

  it('rejects unauthenticated calls', async () => {
    // Given an unauthenticated session
    authMock.mockResolvedValue(null);

    // When revoking a key
    const res = await DELETE(new Request('http://localhost'), {
      params: Promise.resolve({ gatewayKeyId: 'key-1' }),
    });

    // Then it rejects
    expect(res.status).toBe(401);
  });

  it('returns 404 when key is not found for the user', async () => {
    // Given an authenticated user
    authMock.mockResolvedValue({ user: { id: 'user-123' } });
    getUserGatewayApiKeyByGatewayIdMock.mockResolvedValue(null);

    // When revoking a missing key
    const res = await DELETE(new Request('http://localhost'), {
      params: Promise.resolve({ gatewayKeyId: 'key-1' }),
    });

    // Then it returns not found
    expect(res.status).toBe(404);
  });

  it('is idempotent when key is already revoked', async () => {
    // Given an authenticated user and an already revoked key
    authMock.mockResolvedValue({ user: { id: 'user-123' } });
    getUserGatewayApiKeyByGatewayIdMock.mockResolvedValue({
      revokedAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    // When revoking again
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const res = await DELETE(new Request('http://localhost'), {
      params: Promise.resolve({ gatewayKeyId: 'key-1' }),
    });

    // Then it succeeds without calling the gateway
    expect(res.status).toBe(204);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('revokes the key via the gateway and marks it revoked', async () => {
    // Given an authenticated user and an active key
    authMock.mockResolvedValue({ user: { id: 'user-123' } });
    getUserGatewayApiKeyByGatewayIdMock.mockResolvedValue({ revokedAt: null });

    // And the gateway succeeds
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(null, { status: 204 })),
    );

    // When revoking the key
    const res = await DELETE(new Request('http://localhost'), {
      params: Promise.resolve({ gatewayKeyId: 'key-1' }),
    });

    // Then it calls the gateway
    const fetchCall = (global.fetch as any).mock.calls[0];
    expect(fetchCall[0]).toBe('https://gateway.example/admin/keys/key-1');
    expect(fetchCall[1]).toEqual(
      expect.objectContaining({
        method: 'DELETE',
        headers: expect.objectContaining({
          'x-admin-api-key': 'admin-token',
        }),
      }),
    );

    // And it marks the key revoked
    expect(markUserGatewayApiKeyRevokedMock).toHaveBeenCalledWith({
      userId: 'user-123',
      gatewayKeyId: 'key-1',
    });

    // And it returns no content
    expect(res.status).toBe(204);
  });
});
