'use client';

import type { User } from 'next-auth';
import { signOut } from 'next-auth/react';
import Link from 'next/link';

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
  dark?: boolean;
}

export function CodeUserNav({
  user,
  plan,
  showDashboardLink = false,
  dark = false,
}: CodeUserNavProps) {
  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/offers/code', redirect: true });
  };

  const handleUpgrade = () => {
    if (dark) {
      // On billing page - open plan dialog
      window.dispatchEvent(new Event('open-pricing-dialog'));
    } else {
      // On landing page - navigate to billing
      window.location.href = '/billing?tab=billing';
    }
  };

  const planLabel = plan === 'code_pro' ? 'Pro' : plan === 'code_max' ? 'Max' : 'No plan';

  // Code theme colors for plan badges
  const planBadgeClass = plan === 'code_max'
    ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
    : plan === 'code_pro'
      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
      : 'bg-white/10 text-white/60 border-white/20';

  // Display name: use name if available, otherwise email
  const displayName = user.name || user.email?.split('@')[0] || 'User';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          'flex items-center justify-center rounded-full transition-all',
          'ring-2 ring-transparent hover:ring-white/20',
          'focus:outline-none focus:ring-white/30'
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

      {/* Code theme menu - dark style for both light/dark modes */}
      <DropdownMenuContent
        align="end"
        className="w-64 bg-[#1a1d24] border-white/10 text-white"
      >
        {/* Header with name, email, and plan */}
        <div className="px-3 py-3">
          <p className="font-semibold text-white/90 truncate">
            {displayName}
          </p>
          <p className="text-sm text-white/50 truncate mt-0.5">
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

        <DropdownMenuSeparator className="bg-white/10" />

        {/* Dashboard link - only on landing page */}
        {showDashboardLink && (
          <DropdownMenuItem asChild>
            <Link
              href="/billing"
              className="cursor-pointer text-white/80 hover:text-white hover:bg-white/10 focus:bg-white/10 focus:text-white"
            >
              Dashboard
            </Link>
          </DropdownMenuItem>
        )}

        {/* Upgrade button - when not on Max */}
        {plan !== 'code_max' && (
          <DropdownMenuItem
            className="cursor-pointer text-white/80 hover:text-white hover:bg-white/10 focus:bg-white/10 focus:text-white"
            onClick={handleUpgrade}
          >
            Upgrade
          </DropdownMenuItem>
        )}

        {(showDashboardLink || plan !== 'code_max') && (
          <DropdownMenuSeparator className="bg-white/10" />
        )}

        {/* Sign out */}
        <DropdownMenuItem
          className="cursor-pointer text-white/80 hover:text-white hover:bg-white/10 focus:bg-white/10 focus:text-white"
          onClick={handleSignOut}
        >
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
