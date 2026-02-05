import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  authMock,
  listUserGatewayApiKeysMock,
  createUserGatewayApiKeyMetadataMock,
  getLatestPledgeForUserMock,
} = vi.hoisted(() => ({
  authMock: vi.fn(),
  listUserGatewayApiKeysMock: vi.fn(),
  createUserGatewayApiKeyMetadataMock: vi.fn(),
  getLatestPledgeForUserMock: vi.fn(),
}));

vi.mock('@/app/(auth)/auth', () => ({
  auth: authMock,
}));

vi.mock('@/lib/code-gateway/api-keys-db', () => ({
  listUserGatewayApiKeys: listUserGatewayApiKeysMock,
  createUserGatewayApiKeyMetadata: createUserGatewayApiKeyMetadataMock,
  getLatestPledgeForUser: getLatestPledgeForUserMock,
}));

import { GET, POST } from './route';

describe('/api/keys', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.resetAllMocks();
    process.env.CODE_GATEWAY_URL = 'https://gateway.example';
    process.env.CODE_GATEWAY_ADMIN_TOKEN = 'admin-token';
  });

  it('rejects unauthenticated calls', async () => {
    // Given an unauthenticated session
    authMock.mockResolvedValue(null);

    // When calling the route
    const res = await GET();

    // Then it rejects
    expect(res.status).toBe(401);
  });

  it('lists the current user keys', async () => {
    // Given an authenticated user
    authMock.mockResolvedValue({ user: { id: 'user-123' } });
    listUserGatewayApiKeysMock.mockResolvedValue([
      {
        gatewayKeyId: 'key-1',
        keyPrefix: 'umans_abc',
        createdAt: '2026-01-01T00:00:00.000Z',
        revokedAt: null,
      },
    ]);

    // When listing keys
    const res = await GET();

    // Then it returns the user keys
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      keys: [
        {
          gatewayKeyId: 'key-1',
          keyPrefix: 'umans_abc',
          createdAt: '2026-01-01T00:00:00.000Z',
          revokedAt: null,
        },
      ],
    });
    expect(listUserGatewayApiKeysMock).toHaveBeenCalledWith('user-123');
  });

  it('rejects key creation when user has no active pledge', async () => {
    // Given an authenticated user without an active pledge
    authMock.mockResolvedValue({ user: { id: 'user-123' } });
    getLatestPledgeForUserMock.mockResolvedValue(null);

    // When creating a key
    const res = await POST();

    // Then it rejects
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'subscription_required' });
  });

  it('creates a gateway key and stores metadata', async () => {
    // Given an authenticated, subscribed user
    authMock.mockResolvedValue({ user: { id: 'user-123' } });
    getLatestPledgeForUserMock.mockResolvedValue({
      status: 'active',
      plan: 'code_pro',
    });

    // And the gateway succeeds
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            id: '11111111-1111-1111-1111-111111111111',
            key: 'secret-key',
            key_prefix: 'umans_abc',
          }),
          {
            status: 201,
            headers: { 'content-type': 'application/json' },
          },
        ),
      ),
    );

    // When creating a key
    const res = await POST();

    // Then it returns the plaintext key once
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({
      id: '11111111-1111-1111-1111-111111111111',
      key: 'secret-key',
      key_prefix: 'umans_abc',
    });

    // And it calls the gateway with admin credentials
    const fetchCall = (global.fetch as any).mock.calls[0];
    expect(fetchCall[0]).toBe('https://gateway.example/admin/keys');
    expect(fetchCall[1]).toEqual(
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'x-admin-api-key': 'admin-token',
        }),
      }),
    );

    // And it stores only the metadata
    expect(createUserGatewayApiKeyMetadataMock).toHaveBeenCalledWith({
      userId: 'user-123',
      gatewayKeyId: '11111111-1111-1111-1111-111111111111',
      keyPrefix: 'umans_abc',
    });
  });
});
