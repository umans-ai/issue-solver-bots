'use client';

import type { User } from 'next-auth';
import { signOut } from 'next-auth/react';
import Link from 'next/link';
import { useTheme } from 'next-themes';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

type CodePlan = 'code_pro' | 'code_max' | null;

interface CodeUserNavProps {
  user: User;
  plan?: CodePlan;
  showDashboardLink?: boolean;
}

export function CodeUserNav({
  user,
  plan,
  showDashboardLink = false,
}: CodeUserNavProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/offers/code', redirect: true });
  };

  const handleUpgrade = () => {
    // Navigate to billing page
    window.location.href = '/billing?tab=billing';
  };

  const planLabel = plan === 'code_pro' ? 'Pro' : plan === 'code_max' ? 'Max' : 'No plan';

  // Plan badge colors - adapt to theme
  const planBadgeClass = isDark
    ? plan === 'code_max'
      ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
      : plan === 'code_pro'
        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
        : 'bg-white/10 text-white/60 border-white/20'
    : plan === 'code_max'
      ? 'bg-amber-500/15 text-amber-600 border-amber-500/30'
      : plan === 'code_pro'
        ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30'
        : 'bg-black/5 text-black/60 border-black/10';

  // Display name: use name if available, otherwise email
  const displayName = user.name || user.email?.split('@')[0] || 'User';

  // Theme-aware classes - matching landing page bg colors
  const menuBg = isDark ? 'bg-[#0b0d10] border-white/10 text-white' : 'bg-[#f6f6f4] border-black/10 text-[#0b0d10]';
  const separatorColor = isDark ? 'bg-white/10' : 'bg-black/10';
  const itemText = isDark
    ? 'text-white/80 hover:text-white hover:bg-white/10 focus:bg-white/10 focus:text-white'
    : 'text-[#0b0d10]/80 hover:text-[#0b0d10] hover:bg-black/5 focus:bg-black/5 focus:text-[#0b0d10]';
  const triggerRing = isDark
    ? 'ring-2 ring-transparent hover:ring-white/20 focus:ring-white/30'
    : 'ring-2 ring-transparent hover:ring-black/20 focus:ring-black/30';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          'flex items-center justify-center rounded-full transition-all',
          triggerRing
        )}
      >
        <Avatar
          user={{
            image: user.image,
            name: user.name,
            email: user.email,
          }}
          size={36}
        />
      </DropdownMenuTrigger>

      {/* Theme-aware dropdown */}
      <DropdownMenuContent
        align="end"
        className={cn('w-64', menuBg)}
      >
        {/* Header with name, email, and plan */}
        <div className="px-3 py-3">
          <p className={cn('font-semibold truncate', isDark ? 'text-white/90' : 'text-[#0b0d10]/90')}>
            {displayName}
          </p>
          <p className={cn('text-sm truncate mt-0.5', isDark ? 'text-white/50' : 'text-[#0b0d10]/50')}>
            {user.email}
          </p>

          {/* Plan badge below email */}
          <div className="mt-2.5 flex items-center gap-2">
            <span
              className={cn(
                'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium border',
                planBadgeClass
              )}
            >
              {planLabel}
            </span>
          </div>
        </div>

        <DropdownMenuSeparator className={separatorColor} />

        {/* Dashboard link - only on landing page */}
        {showDashboardLink && (
          <DropdownMenuItem asChild>
            <Link
              href="/billing"
              className={cn('cursor-pointer', itemText)}
            >
              Dashboard
            </Link>
          </DropdownMenuItem>
        )}

        {/* Upgrade button - when not on Max */}
        {plan !== 'code_max' && (
          <DropdownMenuItem
            className={cn('cursor-pointer', itemText)}
            onClick={handleUpgrade}
          >
            Upgrade
          </DropdownMenuItem>
        )}

        {(showDashboardLink || plan !== 'code_max') && (
          <DropdownMenuSeparator className={separatorColor} />
        )}

        {/* Sign out */}
        <DropdownMenuItem
          className={cn('cursor-pointer', itemText)}
          onClick={handleSignOut}
        >
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
