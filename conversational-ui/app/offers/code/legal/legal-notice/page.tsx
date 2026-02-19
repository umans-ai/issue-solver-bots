'use client';

import Link from 'next/link';
import { ThemeToggle } from '@/components/theme-toggle';
import { IconUmansLogo } from '@/components/icons';
import { cn } from '@/lib/utils';
import { FaDiscord, FaLinkedinIn, FaXTwitter } from 'react-icons/fa6';

const primaryButtonClasses =
  'rounded-full bg-[#0b0d10] text-white hover:bg-black/90 shadow-sm dark:bg-white dark:text-[#0b0d10] dark:hover:bg-white/90';

export default function LegalNoticePage() {
  return (
    <div className="min-h-screen bg-[#f6f6f4] dark:bg-[#0b0d10]">
      {/* Header - matching landing page */}
      <header className="sticky top-0 z-40 border-b border-black/10 bg-white/70 backdrop-blur dark:border-white/10 dark:bg-[#0b0d10]/70">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link
            href="/offers/code"
            className="flex items-center gap-2 text-black/70 hover:text-black dark:text-white/80 dark:hover:text-white"
          >
            <IconUmansLogo className="h-5 w-auto" />
            <span className="text-sm font-medium tracking-tight">code</span>
          </Link>

          <nav className="landing-nav hidden items-center gap-6 text-sm font-medium text-black/60 md:flex dark:text-white/70">
            <Link href="/offers/code#plans" className="hover:text-black dark:hover:text-white">
              Plans
            </Link>
            <Link
              href="/offers/code/docs"
              className="hover:text-black dark:hover:text-white"
            >
              Docs
            </Link>
            <Link
              href="https://blog.umans.ai/blog"
              target="_blank"
              rel="noreferrer"
              className="hover:text-black dark:hover:text-white"
            >
              Blog
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-3 text-black/50 md:flex dark:text-white/60">
              <a
                href="https://discord.gg/Q5hdNrk7Rw"
                target="_blank"
                rel="noreferrer"
                className="transition hover:text-black dark:hover:text-white"
                aria-label="Discord"
              >
                <FaDiscord className="h-4 w-4" />
              </a>
              <a
                href="https://x.com/umans_ai"
                target="_blank"
                rel="noreferrer"
                className="transition hover:text-black dark:hover:text-white"
                aria-label="X"
              >
                <FaXTwitter className="h-4 w-4" />
              </a>
              <a
                href="https://www.linkedin.com/company/umans-ai"
                target="_blank"
                rel="noreferrer"
                className="transition hover:text-black dark:hover:text-white"
                aria-label="LinkedIn"
              >
                <FaLinkedinIn className="h-4 w-4" />
              </a>
            </div>
            <ThemeToggle variant="ghost" />
            <Link
              href="/login?next=/billing"
              className={cn(
                'hidden px-4 py-2 text-sm font-medium md:inline-flex',
                primaryButtonClasses
              )}
            >
              Login
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        <div className="prose prose-slate max-w-none dark:prose-invert">
          {/* English Version */}
          <h1 className="text-3xl font-semibold tracking-tight text-[#0b0d10] dark:text-white">
            Legal Notice
          </h1>
          <p className="text-sm text-[#5e5d59] dark:text-white/60">
            Effective date: February 1, 2026
          </p>

          <h2 className="text-xl font-semibold text-[#0b0d10] dark:text-white">Publisher</h2>
          <p className="text-[#5e5d59] dark:text-white/70">
            <strong className="text-[#0b0d10] dark:text-white">UMANS AI (SAS)</strong><br />
            SIREN: 943 333 708 – RCS Nanterre<br />
            VAT: FR43943333708<br />
            Registered office: 14 Rue de Sévigné, 92120 Montrouge, France<br />
            Contact: contact@umans.ai
          </p>

          <h2 className="text-xl font-semibold text-[#0b0d10] dark:text-white">Publication Director</h2>
          <p className="text-[#5e5d59] dark:text-white/70">
            Naji Alazhar
          </p>

          <h2 className="text-xl font-semibold text-[#0b0d10] dark:text-white">Hosting</h2>
          <p className="text-[#5e5d59] dark:text-white/70">
            <strong className="text-[#0b0d10] dark:text-white">Amazon Web Services EMEA SARL</strong><br />
            38 avenue John F. Kennedy, L-1855 Luxembourg, Luxembourg<br />
            Phone: +352 26 73 30 00<br />
            Website: <a href="https://aws.amazon.com" target="_blank" rel="noreferrer" className="text-[#d97757] hover:underline">https://aws.amazon.com</a>
          </p>

          <hr className="my-8 border-black/10 dark:border-white/10" />

          {/* French Version */}
          <h1 className="text-3xl font-semibold tracking-tight text-[#0b0d10] dark:text-white">
            Mentions Légales
          </h1>
          <p className="text-sm text-[#5e5d59] dark:text-white/60">
            Date d&apos;entrée en vigueur : 1er février 2026
          </p>

          <h2 className="text-xl font-semibold text-[#0b0d10] dark:text-white">Éditeur du site</h2>
          <p className="text-[#5e5d59] dark:text-white/70">
            <strong className="text-[#0b0d10] dark:text-white">UMANS AI (SAS)</strong><br />
            SIREN : 943 333 708 – RCS Nanterre<br />
            TVA intracommunautaire : FR43943333708<br />
            Siège social : 14 Rue de Sévigné, 92120 Montrouge, France<br />
            Contact : contact@umans.ai
          </p>

          <h2 className="text-xl font-semibold text-[#0b0d10] dark:text-white">Directeur de la publication</h2>
          <p className="text-[#5e5d59] dark:text-white/70">
            Naji Alazhar
          </p>

          <h2 className="text-xl font-semibold text-[#0b0d10] dark:text-white">Hébergement du site et de l&apos;application</h2>
          <p className="text-[#5e5d59] dark:text-white/70">
            <strong className="text-[#0b0d10] dark:text-white">Amazon Web Services EMEA SARL</strong><br />
            38 avenue John F. Kennedy, L-1855 Luxembourg, Luxembourg<br />
            Téléphone : +352 26 73 30 00<br />
            Site : <a href="https://aws.amazon.com" target="_blank" rel="noreferrer" className="text-[#d97757] hover:underline">https://aws.amazon.com</a>
          </p>
        </div>

        {/* Footer */}
        <footer className="mt-16 border-t border-black/10 pt-8 dark:border-white/10">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-sm text-black/40 dark:text-white/40">
              Umans · code. Built for serious agentic work.
            </p>
            <div className="flex items-center gap-6">
              <Link
                href="/offers/code/legal/terms-of-use"
                className="text-sm text-black/60 hover:text-black dark:text-white/60 dark:hover:text-white"
              >
                Terms
              </Link>
              <Link
                href="/offers/code/legal/privacy-policy"
                className="text-sm text-black/60 hover:text-black dark:text-white/60 dark:hover:text-white"
              >
                Privacy
              </Link>
              <Link
                href="/offers/code/legal/legal-notice"
                className="text-sm text-black dark:text-white"
              >
                Legal Notice
              </Link>
              <Link
                href="https://blog.umans.ai"
                target="_blank"
                rel="noreferrer"
                className="text-sm text-black/60 hover:text-black dark:text-white/60 dark:hover:text-white"
              >
                Blog
              </Link>
              <Link
                href="mailto:contact@umans.ai"
                className="text-sm text-black/60 hover:text-black dark:text-white/60 dark:hover:text-white"
              >
                Contact
              </Link>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
