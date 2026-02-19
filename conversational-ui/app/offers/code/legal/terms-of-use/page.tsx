'use client';

import Link from 'next/link';
import { ThemeToggle } from '@/components/theme-toggle';
import { IconUmansLogo } from '@/components/icons';
import { cn } from '@/lib/utils';
import { FaDiscord, FaLinkedinIn, FaXTwitter } from 'react-icons/fa6';

const primaryButtonClasses =
  'rounded-full bg-[#0b0d10] text-white hover:bg-black/90 shadow-sm dark:bg-white dark:text-[#0b0d10] dark:hover:bg-white/90';

export default function TermsOfUsePage() {
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
          <h1 className="text-3xl font-semibold tracking-tight text-[#0b0d10] dark:text-white">
            UMANS CODE TERMS OF USE
          </h1>
          <p className="text-sm text-[#5e5d59] dark:text-white/60">
            Effective date: February 1, 2026<br />
            Status: Public testing (Beta). Planned general launch: March 1.
          </p>

          <p className="text-[#5e5d59] dark:text-white/70">
            These Terms govern your access to and use of Umans Code (the &ldquo;Service&rdquo;), including our website, app, CLI, APIs, and related services. By using the Service, you agree to these Terms.
          </p>

          <h2 className="text-xl font-semibold text-[#0b0d10] dark:text-white">1. Provider</h2>
          <p className="text-[#5e5d59] dark:text-white/70">
            The Service is provided by UMANS AI (SAS), SIREN 943 333 708, RCS Nanterre, registered office: 14 Rue de Sévigné, 92120 Montrouge, France, VAT FR43943333708.<br />
            Contact: contact@umans.ai
          </p>

          <h2 className="text-xl font-semibold text-[#0b0d10] dark:text-white">2. The Service</h2>
          <p className="text-[#5e5d59] dark:text-white/70">
            Umans Code provides access to AI models operated by UMANS AI and is designed to work with many compatible tools. You may use the Service with any compatible tool of your choice.
          </p>
          <p className="text-[#5e5d59] dark:text-white/70">
            We may change models, routing, endpoints, features, and safeguards to improve performance, safety, and reliability.
          </p>

          <h2 className="text-xl font-semibold text-[#0b0d10] dark:text-white">3. Beta status (public testing)</h2>
          <p className="text-[#5e5d59] dark:text-white/70">The Service is in public testing. You understand that:</p>
          <ul className="list-disc space-y-1 pl-5 text-[#5e5d59] dark:text-white/70">
            <li>features may change, degrade, or be discontinued;</li>
            <li>availability and performance are not guaranteed during Beta;</li>
            <li>we may enforce additional safeguards to protect the Service.</li>
          </ul>

          <h2 className="text-xl font-semibold text-[#0b0d10] dark:text-white">4. Your account and API Keys</h2>
          <p className="text-[#5e5d59] dark:text-white/70">
            You are responsible for all activity under your account and for keeping API Keys confidential. You must not expose API Keys in public repositories or share them with third parties. Notify us promptly of any suspected unauthorized access at contact@umans.ai.
          </p>

          <h2 className="text-xl font-semibold text-[#0b0d10] dark:text-white">5. Acceptable use</h2>
          <p className="text-[#5e5d59] dark:text-white/70"><strong className="text-[#0b0d10] dark:text-white">Allowed:</strong> personal and commercial software development work.</p>
          <p className="text-[#5e5d59] dark:text-white/70"><strong className="text-[#0b0d10] dark:text-white">Not allowed:</strong></p>
          <ul className="list-disc space-y-1 pl-5 text-[#5e5d59] dark:text-white/70">
            <li>sharing, reselling, renting, or sublicensing the Service or API Keys;</li>
            <li>illegal, harmful, abusive, or deceptive activities (including malware, exploitation, fraud, or attempts to compromise systems);</li>
            <li>interfering with or attempting to bypass rate limits, safeguards, or security measures;</li>
            <li>using the Service to infringe intellectual property, confidentiality, or privacy rights.</li>
          </ul>
          <p className="text-[#5e5d59] dark:text-white/70">
            We may suspend or terminate access if we believe you violated these Terms or to protect the Service and other users.
          </p>

          <h2 className="text-xl font-semibold text-[#0b0d10] dark:text-white">6. &ldquo;Unlimited&rdquo; and fairness safeguards</h2>
          <p className="text-[#5e5d59] dark:text-white/70">
            Some plans may be described as &ldquo;unlimited&rdquo;. This means we do not charge per token as the primary billing metric. To maintain a reliable service for everyone, we may apply reasonable safeguards (for example concurrency limits, burst limits, or temporary throttling) and we may take action against abusive usage or API key sharing/reselling.
          </p>

          <h2 className="text-xl font-semibold text-[#0b0d10] dark:text-white">7. Customer Content and outputs</h2>
          <p className="text-[#5e5d59] dark:text-white/70">
            &ldquo;Customer Content&rdquo; means inputs you submit (including prompts, code, files, and context) and outputs generated for you. You retain your rights to Customer Content. You are responsible for ensuring you have the rights to submit Customer Content and to use outputs in your context.
          </p>

          <h2 className="text-xl font-semibold text-[#0b0d10] dark:text-white">8. No prompt storage by default</h2>
          <p className="text-[#5e5d59] dark:text-white/70">
            By default, UMANS AI does not store your request payloads (prompts, code, files) as product data. We monitor usage and errors using technical and usage metadata (for example timestamps, token counts, latency, and error codes). If you contact support, you may choose to share content for troubleshooting.
          </p>

          <h2 className="text-xl font-semibold text-[#0b0d10] dark:text-white">9. Service continuity routing</h2>
          <p className="text-[#5e5d59] dark:text-white/70">
            To maintain continuity during high load or incidents, we may route some requests to third-party inference providers. When routed, your Customer Content is transmitted to that provider only to generate the response. For competitive and security reasons, we do not publish provider names publicly. Details are available on request.
          </p>

          <h2 className="text-xl font-semibold text-[#0b0d10] dark:text-white">10. Fees and billing</h2>
          <p className="text-[#5e5d59] dark:text-white/70">
            Payments are processed by Stripe. UMANS AI does not receive or store card details. We only store Stripe identifiers (for example customer, subscription, and invoice IDs) and subscription status. Fees and plan details are shown at checkout or in the dashboard. Except where required by law, fees are non-refundable.
          </p>

          <h2 className="text-xl font-semibold text-[#0b0d10] dark:text-white">11. Disclaimer</h2>
          <p className="text-[#5e5d59] dark:text-white/70">
            AI outputs may be incorrect, incomplete, or unsafe. You are responsible for reviewing outputs, testing code, and ensuring compliance with your requirements. The Service is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; to the maximum extent permitted by law.
          </p>

          <h2 className="text-xl font-semibold text-[#0b0d10] dark:text-white">12. Limitation of liability</h2>
          <p className="text-[#5e5d59] dark:text-white/70">
            To the maximum extent permitted by law, UMANS AI is not liable for indirect or consequential damages. UMANS AI&apos;s total liability for claims relating to the Service is limited to the amount you paid for the Service in the 3 months preceding the event giving rise to the claim. Nothing limits liability that cannot be limited under applicable law.
          </p>

          <h2 className="text-xl font-semibold text-[#0b0d10] dark:text-white">13. Changes</h2>
          <p className="text-[#5e5d59] dark:text-white/70">
            We may update these Terms. We will provide reasonable notice for material changes (for example via email or in-product notice). Continued use after the effective date means you accept the updated Terms.
          </p>

          <h2 className="text-xl font-semibold text-[#0b0d10] dark:text-white">14. Governing law</h2>
          <p className="text-[#5e5d59] dark:text-white/70">
            These Terms are governed by French law. Courts of competent jurisdiction in France apply, unless mandatory consumer rules provide otherwise.
          </p>

          <h2 className="text-xl font-semibold text-[#0b0d10] dark:text-white">Contact</h2>
          <p className="text-[#5e5d59] dark:text-white/70">contact@umans.ai</p>
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
                className="text-sm text-black dark:text-white"
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
                className="text-sm text-black/60 hover:text-black dark:text-white/60 dark:hover:text-white"
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
