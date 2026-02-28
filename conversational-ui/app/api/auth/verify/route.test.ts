import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  ensureDefaultSpaceMock,
  getUserByVerificationTokenMock,
  isCodeIntentRedirectMock,
  sanitizeInternalRedirectMock,
  verifyUserEmailMock,
} = vi.hoisted(() => ({
  ensureDefaultSpaceMock: vi.fn(),
  getUserByVerificationTokenMock: vi.fn(),
  isCodeIntentRedirectMock: vi.fn(),
  sanitizeInternalRedirectMock: vi.fn(),
  verifyUserEmailMock: vi.fn(),
}));

vi.mock('@/lib/db/queries', () => ({
  ensureDefaultSpace: ensureDefaultSpaceMock,
  getUserByVerificationToken: getUserByVerificationTokenMock,
  verifyUserEmail: verifyUserEmailMock,
}));

vi.mock('@/lib/redirect-intent', () => ({
  isCodeIntentRedirect: isCodeIntentRedirectMock,
  sanitizeInternalRedirect: sanitizeInternalRedirectMock,
}));

import { POST } from './route';

describe('/api/auth/verify', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    ensureDefaultSpaceMock.mockResolvedValue(undefined);
    verifyUserEmailMock.mockResolvedValue([{ email: 'coder@umans.ai' }]);
    sanitizeInternalRedirectMock.mockImplementation((next: unknown) =>
      typeof next === 'string' && next.startsWith('/') ? next : null,
    );
  });

  it('rejects requests without verification token', async () => {
    // Given a request without token
    const request = new Request('http://localhost', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });

    // When verifying the email
    const response = await POST(request);

    // Then it returns a validation error
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: 'Verification token is required',
    });
    expect(verifyUserEmailMock).not.toHaveBeenCalled();
  });

  it('routes code-origin verification to code welcome email', async () => {
    // Given an unverified user and a code-origin redirect intent
    getUserByVerificationTokenMock.mockResolvedValue([
      { id: 'user-123', emailVerified: null },
    ]);
    isCodeIntentRedirectMock.mockReturnValue(true);
    const request = new Request('http://localhost', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        token: 'token-123',
        next: '/billing?pledgePlan=code_pro&pledgeCycle=monthly',
      }),
    });

    // When verifying the email
    const response = await POST(request);

    // Then it marks the welcome email destination as code
    expect(response.status).toBe(200);
    expect(verifyUserEmailMock).toHaveBeenCalledWith('user-123', {
      codeIntent: true,
    });
    expect(ensureDefaultSpaceMock).toHaveBeenCalledWith('user-123');
  });

  it('keeps default welcome destination for non-code verification', async () => {
    // Given an unverified user and a non-code redirect intent
    getUserByVerificationTokenMock.mockResolvedValue([
      { id: 'user-999', emailVerified: null },
    ]);
    isCodeIntentRedirectMock.mockReturnValue(false);
    const request = new Request('http://localhost', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        token: 'token-999',
        next: '/docs/public/acme/repo',
      }),
    });

    // When verifying the email
    const response = await POST(request);

    // Then it keeps the default welcome destination
    expect(response.status).toBe(200);
    expect(verifyUserEmailMock).toHaveBeenCalledWith('user-999', {
      codeIntent: false,
    });
  });
});
