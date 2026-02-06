'use client';

// Central place to decide where Radix portals should mount.
//
// Motivation: product surfaces like `/billing` can have local theming wrappers
// (e.g. "code" UI) that should also apply to portaled content (dialogs, menus).
// When a portal root is present, we mount there; otherwise Radix falls back to
// <body>.

export function getPortalContainer(): HTMLElement | undefined {
  if (typeof document === 'undefined') return undefined;

  const el = document.querySelector<HTMLElement>('[data-umans-portal-root]');
  return el ?? undefined;
}

