import { describe, expect, it } from 'vitest';

import {
  getCodeOfferUrl,
  isCodeIntentRedirect,
  sanitizeInternalRedirect,
} from './redirect-intent';

describe('redirect intent helpers', () => {
  it('sanitizes internal redirects only', () => {
    // Given different redirect values from auth flows
    const safe = sanitizeInternalRedirect('/billing?pledgePlan=code_pro');
    const external = sanitizeInternalRedirect('https://example.com');
    const protocolRelative = sanitizeInternalRedirect('//example.com');

    // When sanitizing redirect values
    // Then only internal app redirects are allowed
    expect(safe).toBe('/billing?pledgePlan=code_pro');
    expect(external).toBeNull();
    expect(protocolRelative).toBeNull();
  });

  it('detects code-origin redirect intents', () => {
    // Given redirects from code and non-code entrypoints
    const codeBilling = '/billing?pledgePlan=code_max&pledgeCycle=yearly';
    const codeLanding = '/offers/code';
    const setupCli = '/setup-cli?callback=http://localhost:8765';
    const workspaceDocs = '/docs/public/umans/repo';

    // When evaluating if redirect came from code flow
    // Then code-related paths are treated as code intent
    expect(isCodeIntentRedirect(codeBilling)).toBe(true);
    expect(isCodeIntentRedirect(codeLanding)).toBe(true);
    expect(isCodeIntentRedirect(setupCli)).toBe(true);
    expect(isCodeIntentRedirect(workspaceDocs)).toBe(false);
  });

  it('builds a code subdomain url from app domains', () => {
    // Given app-hosted environments
    const productionApp = 'https://app.umans.ai';
    const previewApp = 'https://app.pr-123.umans.ai';

    // When building the code destination
    // Then it maps app.* to code.*
    expect(getCodeOfferUrl(productionApp)).toBe('https://code.umans.ai');
    expect(getCodeOfferUrl(previewApp)).toBe('https://code.pr-123.umans.ai');
  });

  it('falls back to /offers/code when host is not app subdomain', () => {
    // Given non-app hosts
    const localhost = 'http://localhost:3000';
    const invalid = 'not-a-valid-url';

    // When building the code destination
    // Then it uses safe fallbacks
    expect(getCodeOfferUrl(localhost)).toBe('http://localhost:3000/offers/code');
    expect(getCodeOfferUrl(invalid)).toBe('https://code.umans.ai');
  });
});
