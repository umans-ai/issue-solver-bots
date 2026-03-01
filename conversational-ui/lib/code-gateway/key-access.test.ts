import { describe, expect, it } from 'vitest';
import {
  asCodePledgePlan,
  getGatewayKeyAccessActionForPledgeStatus,
  getGatewayKeyLimitUpdateForAction,
  isPledgeStatusWithKeyAccess,
} from './key-access';

describe('code gateway key access mapping', () => {
  it('treats active and trialing as key-enabled statuses', () => {
    // Given/When/Then
    expect(isPledgeStatusWithKeyAccess('active')).toBe(true);
    expect(isPledgeStatusWithKeyAccess('trialing')).toBe(true);
  });

  it('treats past_due and canceled as key-disabled statuses', () => {
    // Given/When/Then
    expect(isPledgeStatusWithKeyAccess('past_due')).toBe(false);
    expect(isPledgeStatusWithKeyAccess('canceled')).toBe(false);
  });

  it('maps statuses to pause or resume actions', () => {
    // Given/When/Then
    expect(getGatewayKeyAccessActionForPledgeStatus('active')).toBe('resume');
    expect(getGatewayKeyAccessActionForPledgeStatus('past_due')).toBe('pause');
    expect(getGatewayKeyAccessActionForPledgeStatus('unknown')).toBeNull();
  });

  it('returns plan limits for resume and paused limits for pause', () => {
    // Given/When/Then
    expect(getGatewayKeyLimitUpdateForAction('resume', 'code_pro')).toEqual({
      requests_limit: 200,
      window_seconds: 18000,
      max_concurrency: 0,
      plan_slug: 'code_pro',
    });
    expect(getGatewayKeyLimitUpdateForAction('pause', 'code_max')).toEqual({
      requests_limit: 0,
      window_seconds: 18000,
      max_concurrency: 0,
      plan_slug: 'code_paused',
    });
  });

  it('parses only code plans', () => {
    // Given/When/Then
    expect(asCodePledgePlan('code_pro')).toBe('code_pro');
    expect(asCodePledgePlan('code_max')).toBe('code_max');
    expect(asCodePledgePlan('free')).toBeNull();
  });
});
