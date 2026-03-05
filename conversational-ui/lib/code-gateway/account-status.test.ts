import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock server-only before importing the module under test
vi.mock('server-only', () => ({
  default: undefined,
}));

const { fetchMock } = vi.hoisted(() => ({
  fetchMock: vi.fn(),
}));

vi.stubGlobal('fetch', fetchMock);

import { notifyGateway, notifyGatewayForPledge } from './account-status';

describe('notifyGateway', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    process.env.CODE_GATEWAY_URL = 'https://gateway.example.com';
    process.env.CODE_GATEWAY_WEBHOOK_SECRET = 'whsec_test_secret';
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Given gateway is configured', () => {
    it('sends the account status update to the gateway', async () => {
      // Given a valid payload
      const payload = {
        principal_id: 'user-123',
        account_id: 'cus_123',
        status: 'suspended' as const,
        reason: 'payment_failed' as const,
      };

      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true }), { status: 200 })
      );

      // When notifying the gateway
      await notifyGateway(payload);

      // Then it calls the gateway with correct parameters
      expect(fetchMock).toHaveBeenCalledWith(
        'https://gateway.example.com/webhooks/account',
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-webhook-secret': 'whsec_test_secret',
          },
          body: JSON.stringify(payload),
          signal: expect.any(AbortSignal),
        }
      );
    });

    it('retries on 5xx errors with exponential backoff', async () => {
      // Given a payload that encounters server errors
      const payload = {
        principal_id: 'user-123',
        account_id: 'cus_123',
        status: 'suspended' as const,
        reason: 'payment_failed' as const,
      };

      // First two calls fail with 500, third succeeds
      fetchMock
        .mockResolvedValueOnce(new Response('Server Error', { status: 500 }))
        .mockResolvedValueOnce(new Response('Server Error', { status: 500 }))
        .mockResolvedValueOnce(new Response(JSON.stringify({ success: true }), { status: 200 }));

      // When notifying the gateway
      const promise = notifyGateway(payload);

      // Then it retries with exponential backoff (attempt=1 -> 2000ms, attempt=2 -> 4000ms)
      await vi.advanceTimersByTimeAsync(2000); // First retry after 2s
      expect(fetchMock).toHaveBeenCalledTimes(2);

      await vi.advanceTimersByTimeAsync(4000); // Second retry after 4s
      expect(fetchMock).toHaveBeenCalledTimes(3);

      await promise;
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    it('retries on 429 rate limit errors', async () => {
      // Given a payload that gets rate limited
      const payload = {
        principal_id: 'user-123',
        account_id: 'cus_123',
        status: 'active' as const,
        reason: null,
      };

      fetchMock
        .mockResolvedValueOnce(new Response('Too Many Requests', { status: 429 }))
        .mockResolvedValueOnce(new Response(JSON.stringify({ success: true }), { status: 200 }));

      // When notifying the gateway
      const promise = notifyGateway(payload);
      await vi.advanceTimersByTimeAsync(2000);

      // Then it retries
      await promise;
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('does not retry on 4xx client errors', async () => {
      // Given a payload with invalid data
      const payload = {
        principal_id: 'user-123',
        account_id: 'cus_123',
        status: 'suspended' as const,
        reason: 'payment_failed' as const,
      };

      fetchMock.mockResolvedValueOnce(
        new Response('Bad Request', { status: 400 })
      );

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // When notifying the gateway
      await notifyGateway(payload);

      // Then it does not retry (only one call) and logs non-retryable error
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenCalledWith('[Gateway] Failed (non-retryable):', expect.any(Error));

      consoleSpy.mockRestore();
    });

    it('retries on network errors', async () => {
      // Given a payload that encounters network issues
      const payload = {
        principal_id: 'user-123',
        account_id: 'cus_123',
        status: 'suspended' as const,
        reason: 'payment_failed' as const,
      };

      fetchMock
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(new Response(JSON.stringify({ success: true }), { status: 200 }));

      // When notifying the gateway
      const promise = notifyGateway(payload);
      await vi.advanceTimersByTimeAsync(2000);
      await vi.advanceTimersByTimeAsync(4000);

      // Then it retries until success
      await promise;
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    it('gives up after 5 retries', async () => {
      // Given a consistently failing gateway
      const payload = {
        principal_id: 'user-123',
        account_id: 'cus_123',
        status: 'suspended' as const,
        reason: 'payment_failed' as const,
      };

      fetchMock.mockResolvedValue(
        new Response('Server Error', { status: 500 })
      );

      // When notifying the gateway
      const promise = notifyGateway(payload);

      // Advance through all retry delays (exponential: 2s, 4s, 8s, 16s, 32s)
      await vi.advanceTimersByTimeAsync(2000);
      await vi.advanceTimersByTimeAsync(4000);
      await vi.advanceTimersByTimeAsync(8000);
      await vi.advanceTimersByTimeAsync(16000);
      await vi.advanceTimersByTimeAsync(32000);

      // Then it gives up after 5 attempts (initial + 4 retries)
      await promise;
      expect(fetchMock).toHaveBeenCalledTimes(5);
    });
  });

  describe('Given gateway is not configured', () => {
    it('silently skips notification when CODE_GATEWAY_URL is missing', async () => {
      // Given missing configuration
      delete process.env.CODE_GATEWAY_URL;

      const payload = {
        principal_id: 'user-123',
        account_id: 'cus_123',
        status: 'suspended' as const,
        reason: 'payment_failed' as const,
      };

      // When notifying the gateway
      await notifyGateway(payload);

      // Then it does not call fetch
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('silently skips notification when CODE_GATEWAY_WEBHOOK_SECRET is missing', async () => {
      // Given missing webhook secret
      delete process.env.CODE_GATEWAY_WEBHOOK_SECRET;

      const payload = {
        principal_id: 'user-123',
        account_id: 'cus_123',
        status: 'suspended' as const,
        reason: 'payment_failed' as const,
      };

      // When notifying the gateway
      await notifyGateway(payload);

      // Then it does not call fetch
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });
});

describe('notifyGatewayForPledge', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.CODE_GATEWAY_URL = 'https://gateway.example.com';
    process.env.CODE_GATEWAY_WEBHOOK_SECRET = 'whsec_test_secret';

    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ success: true }), { status: 200 })
    );
  });

  describe('Given an individual pledge (user_id present)', () => {
    it('notifies the gateway with the user as principal', async () => {
      // Given an individual pledge
      const pledge = {
        userId: 'user-123',
        stripeCustomerId: 'cus_123',
      };

      // When notifying for suspension
      await notifyGatewayForPledge(pledge, 'suspended', 'payment_failed');

      // Then it calls the gateway with user as principal
      expect(fetchMock).toHaveBeenCalledWith(
        'https://gateway.example.com/webhooks/account',
        expect.objectContaining({
          body: expect.stringContaining('"principal_id":"user-123"'),
        })
      );
      expect(fetchMock).toHaveBeenCalledWith(
        'https://gateway.example.com/webhooks/account',
        expect.objectContaining({
          body: expect.stringContaining('"account_id":"cus_123"'),
        })
      );
    });

    it('uses userId as fallback when stripeCustomerId is null', async () => {
      // Given a pledge without stripe customer ID
      const pledge = {
        userId: 'user-123',
        stripeCustomerId: null,
      };

      // When notifying
      await notifyGatewayForPledge(pledge, 'active', null);

      // Then it uses userId as account_id fallback
      expect(fetchMock).toHaveBeenCalledWith(
        'https://gateway.example.com/webhooks/account',
        expect.objectContaining({
          body: expect.stringContaining('"account_id":"user-123"'),
        })
      );
    });
  });

  describe('Given an organization pledge (org_id present, user_id null)', () => {
    it('warns that org pledges are not yet supported', async () => {
      // Given an org pledge (no userId)
      const pledge = {
        userId: null,
        stripeCustomerId: 'cus_org_123',
      };

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // When notifying
      await notifyGatewayForPledge(pledge, 'suspended', 'payment_failed');

      // Then it warns about unsupported org pledges
      expect(consoleSpy).toHaveBeenCalledWith('[Gateway] Org pledges not yet supported');
      expect(fetchMock).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });
});
