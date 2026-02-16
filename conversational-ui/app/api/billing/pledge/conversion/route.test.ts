import { beforeEach, describe, expect, it, vi } from 'vitest';

const { authMock, getStripeMock, retrieveCheckoutSessionMock } = vi.hoisted(
  () => ({
    authMock: vi.fn(),
    getStripeMock: vi.fn(),
    retrieveCheckoutSessionMock: vi.fn(),
  }),
);

vi.mock('@/app/(auth)/auth', () => ({
  auth: authMock,
}));

vi.mock('@/lib/stripe', () => ({
  getStripe: getStripeMock,
}));

import { POST } from './route';

describe('/api/billing/pledge/conversion', () => {
  beforeEach(() => {
    vi.resetAllMocks();

    getStripeMock.mockReturnValue({
      checkout: {
        sessions: {
          retrieve: retrieveCheckoutSessionMock,
        },
      },
    });
  });

  it('rejects unauthenticated calls', async () => {
    // Given an unauthenticated request
    authMock.mockResolvedValue(null);

    // When checking conversion eligibility
    const res = await POST(new Request('http://localhost', { method: 'POST' }));

    // Then it rejects the request
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'unauthorized' });
  });

  it('rejects invalid session ids', async () => {
    // Given an authenticated user and an invalid payload
    authMock.mockResolvedValue({ user: { id: 'user-123' } });

    // When checking conversion eligibility
    const res = await POST(
      new Request('http://localhost', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      }),
    );

    // Then it validates the request body
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'invalid_session_id' });
    expect(getStripeMock).not.toHaveBeenCalled();
  });

  it('returns not found when Stripe cannot load the checkout session', async () => {
    // Given an authenticated user and a missing checkout session
    authMock.mockResolvedValue({ user: { id: 'user-123' } });
    retrieveCheckoutSessionMock.mockRejectedValue(new Error('not found'));

    // When checking conversion eligibility
    const res = await POST(
      new Request('http://localhost', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sessionId: 'cs_test_123' }),
      }),
    );

    // Then it reports the missing session
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'session_not_found' });
  });

  it('marks completed pledge subscriptions as eligible conversions', async () => {
    // Given an authenticated user and a completed pledge checkout session
    authMock.mockResolvedValue({ user: { id: 'user-123' } });
    retrieveCheckoutSessionMock.mockResolvedValue({
      id: 'cs_test_123',
      status: 'complete',
      mode: 'subscription',
      client_reference_id: 'user-123',
      metadata: {
        source: 'umans-code-pledge',
        plan: 'code_pro',
        cycle: 'monthly',
        userId: 'user-123',
      },
      subscription: {
        status: 'trialing',
      },
    });

    // When checking conversion eligibility
    const res = await POST(
      new Request('http://localhost', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sessionId: 'cs_test_123' }),
      }),
    );

    // Then it marks the conversion as eligible
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      eligible: true,
      sessionId: 'cs_test_123',
      plan: 'code_pro',
      billingCycle: 'monthly',
    });
    expect(retrieveCheckoutSessionMock).toHaveBeenCalledWith('cs_test_123', {
      expand: ['subscription'],
    });
  });

  it('keeps conversion ineligible when checkout belongs to another user', async () => {
    // Given an authenticated user and another user's checkout session
    authMock.mockResolvedValue({ user: { id: 'user-123' } });
    retrieveCheckoutSessionMock.mockResolvedValue({
      id: 'cs_test_456',
      status: 'complete',
      mode: 'subscription',
      client_reference_id: 'user-999',
      metadata: {
        source: 'umans-code-pledge',
        plan: 'code_max',
        cycle: 'yearly',
        userId: 'user-999',
      },
      subscription: {
        status: 'active',
      },
    });

    // When checking conversion eligibility
    const res = await POST(
      new Request('http://localhost', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sessionId: 'cs_test_456' }),
      }),
    );

    // Then it does not mark the conversion as eligible
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      eligible: false,
      sessionId: 'cs_test_456',
      plan: 'code_max',
      billingCycle: 'yearly',
    });
  });
});
