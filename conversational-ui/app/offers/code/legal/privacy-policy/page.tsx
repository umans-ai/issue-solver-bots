'use client';

import Link from 'next/link';
import { ThemeToggle } from '@/components/theme-toggle';
import { IconUmansLogo } from '@/components/icons';
import { cn } from '@/lib/utils';
import { FaDiscord, FaLinkedinIn, FaXTwitter } from 'react-icons/fa6';

const primaryButtonClasses =
  'rounded-full bg-[#0b0d10] text-white hover:bg-black/90 shadow-sm dark:bg-white dark:text-[#0b0d10] dark:hover:bg-white/90';

export default function PrivacyPolicyPage() {
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
            UMANS CODE PRIVACY POLICY
          </h1>
          <p className="text-sm text-[#5e5d59] dark:text-white/60">
            Effective date: February 1, 2026
          </p>

          <p className="text-[#5e5d59] dark:text-white/70">
            This policy explains how UMANS AI processes personal data when you use Umans Code.
          </p>

          <h2 className="text-xl font-semibold text-[#0b0d10] dark:text-white">1. Controller</h2>
          <p className="text-[#5e5d59] dark:text-white/70">
            UMANS AI (SAS), SIREN 943 333 708, RCS Nanterre<br />
            Registered office: 14 Rue de Sévigné, 92120 Montrouge, France<br />
            Contact for privacy requests: contact@umans.ai
          </p>

          <h2 className="text-xl font-semibold text-[#0b0d10] dark:text-white">2. Personal data we process</h2>

          <h3 className="text-lg font-semibold text-[#0b0d10] dark:text-white">A) Account data</h3>
          <ul className="list-disc space-y-1 pl-5 text-[#5e5d59] dark:text-white/70">
            <li>email, name (if provided), organization (if provided)</li>
            <li>authentication events and account settings</li>
          </ul>

          <h3 className="text-lg font-semibold text-[#0b0d10] dark:text-white">B) Billing data (via Stripe)</h3>
          <ul className="list-disc space-y-1 pl-5 text-[#5e5d59] dark:text-white/70">
            <li>subscription status and billing events</li>
            <li>Stripe identifiers (for example customer, subscription, and invoice IDs)</li>
            <li>We do not receive or store payment card details.</li>
          </ul>

          <h3 className="text-lg font-semibold text-[#0b0d10] dark:text-white">C) Usage, security, and reliability metadata</h3>
          <ul className="list-disc space-y-1 pl-5 text-[#5e5d59] dark:text-white/70">
            <li>timestamps, token counts, request size, model identifier, latency</li>
            <li>IP address and security logs for abuse prevention</li>
            <li>error logs and diagnostics (status codes, traces)</li>
          </ul>

          <h3 className="text-lg font-semibold text-[#0b0d10] dark:text-white">D) Support</h3>
          <ul className="list-disc space-y-1 pl-5 text-[#5e5d59] dark:text-white/70">
            <li>messages and information you choose to share with support</li>
          </ul>

          <h3 className="text-lg font-semibold text-[#0b0d10] dark:text-white">E) Analytics (PostHog)</h3>
          <ul className="list-disc space-y-1 pl-5 text-[#5e5d59] dark:text-white/70">
            <li>product analytics events and usage measurement</li>
            <li>technical identifiers stored in cookies and/or localStorage depending on your cookie choices</li>
          </ul>

          <h2 className="text-xl font-semibold text-[#0b0d10] dark:text-white">3. Customer Content (prompts, code, files)</h2>
          <p className="text-[#5e5d59] dark:text-white/70">
            We process the content you submit to generate responses. By default, we do not store request payloads (prompts, code, files) as product data. If you contact support, you may choose to share content for troubleshooting.
          </p>

          <h2 className="text-xl font-semibold text-[#0b0d10] dark:text-white">4. Purposes and legal bases</h2>
          <p className="text-[#5e5d59] dark:text-white/70">We process personal data to:</p>
          <ul className="list-disc space-y-1 pl-5 text-[#5e5d59] dark:text-white/70">
            <li>provide the Service, authenticate users, manage accounts (contract)</li>
            <li>manage subscriptions and billing events (contract, legal obligations)</li>
            <li>ensure security, prevent abuse, maintain reliability (legitimate interests)</li>
            <li>provide customer support (contract, legitimate interests)</li>
            <li>measure usage and improve the product with analytics (legitimate interests and/or consent for cookies where required)</li>
          </ul>

          <h2 className="text-xl font-semibold text-[#0b0d10] dark:text-white">5. Cookies and similar technologies</h2>
          <p className="text-[#5e5d59] dark:text-white/70">
            We use essential cookies for core functionality and security. We use analytics cookies and/or localStorage (PostHog) for usage measurement and product improvement. Where required by law (including in France), analytics is enabled only after you consent via our cookie preferences.
          </p>

          <h2 className="text-xl font-semibold text-[#0b0d10] dark:text-white">6. Recipients</h2>
          <p className="text-[#5e5d59] dark:text-white/70">We share personal data only with:</p>
          <ul className="list-disc space-y-1 pl-5 text-[#5e5d59] dark:text-white/70">
            <li>payment processor: Stripe</li>
            <li>infrastructure and hosting providers</li>
            <li>analytics provider: PostHog</li>
            <li>monitoring and error tracking providers (if used)</li>
            <li>third-party inference providers used for service continuity routing during high load or incidents</li>
          </ul>
          <p className="text-[#5e5d59] dark:text-white/70">We do not sell personal data.</p>

          <h2 className="text-xl font-semibold text-[#0b0d10] dark:text-white">7. Service continuity routing and subprocessors</h2>
          <p className="text-[#5e5d59] dark:text-white/70">
            During high load or incidents, we may route some requests to third-party inference providers to ensure continuity. When routed, Customer Content is transmitted to the provider only to generate the response. For competitive and security reasons, we do not publish provider names publicly. Details are available on request.
          </p>

          <h2 className="text-xl font-semibold text-[#0b0d10] dark:text-white">8. International transfers</h2>
          <p className="text-[#5e5d59] dark:text-white/70">
            Because we serve customers globally and may route requests to third parties, personal data may be processed outside the EEA. Where required, we rely on appropriate safeguards such as Standard Contractual Clauses or adequacy decisions. You can request more details at contact@umans.ai.
          </p>

          <h2 className="text-xl font-semibold text-[#0b0d10] dark:text-white">9. Retention</h2>
          <p className="text-[#5e5d59] dark:text-white/70">We keep personal data only as long as needed:</p>
          <ul className="list-disc space-y-1 pl-5 text-[#5e5d59] dark:text-white/70">
            <li>account data: for the life of the account, then up to 12 months</li>
            <li>usage and security logs: up to 12 months</li>
            <li>error logs: up to 90 days</li>
            <li>support communications: up to 24 months</li>
            <li>billing records: as required by law</li>
          </ul>

          <h2 className="text-xl font-semibold text-[#0b0d10] dark:text-white">10. Your rights</h2>
          <p className="text-[#5e5d59] dark:text-white/70">
            Depending on your location, you may have rights of access, rectification, erasure, restriction, objection, and portability. To exercise rights, contact contact@umans.ai. You may lodge a complaint with your data protection authority (in France: CNIL).
          </p>

          <h2 className="text-xl font-semibold text-[#0b0d10] dark:text-white">11. Changes</h2>
          <p className="text-[#5e5d59] dark:text-white/70">
            We may update this policy and will provide reasonable notice for material changes.
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
                className="text-sm text-black dark:text-white"
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
