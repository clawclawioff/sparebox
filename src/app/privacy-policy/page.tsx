import Link from "next/link";
import { SpareboxLogo } from "@/components/sparebox-logo";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy - Sparebox",
  description: "How Sparebox collects, uses, and protects your personal information.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-amber-50 text-stone-900">
      {/* Subtle warm gradient background */}
      <div className="fixed inset-0 bg-gradient-to-b from-orange-50 via-amber-50 to-amber-100/50 pointer-events-none" />

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <SpareboxLogo variant="full" size="md" href="/" />
        </div>
        <div className="flex items-center gap-4">
          <Link href="/pricing" className="text-stone-600 hover:text-stone-900 transition">
            Pricing
          </Link>
          <Link href="/blog" className="text-stone-600 hover:text-stone-900 transition">
            Blog
          </Link>
          <Link href="/login" className="text-stone-600 hover:text-stone-900 transition">
            Log in
          </Link>
          <Link
            href="/signup"
            className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-medium transition shadow-sm"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Content */}
      <main className="relative z-10 max-w-3xl mx-auto px-6 py-16">
        <div className="bg-white border border-stone-200 rounded-2xl p-8 md:p-12 shadow-sm">
          <p className="text-sm text-stone-500 mb-2">Last updated: February 6, 2026</p>
          <h1 className="text-4xl font-bold mb-8 tracking-tight text-stone-900">Privacy Policy</h1>

          <div className="prose prose-stone max-w-none">
            <p className="text-lg text-stone-600 mb-8">
              At Sparebox, we take your privacy seriously. This policy explains what information we collect, 
              how we use it, and your rights regarding your data. We&apos;ve tried to keep this readable — 
              no walls of legalese.
            </p>

            <Section title="What We Collect">
              <p>When you use Sparebox, we collect different types of information depending on how you use the platform:</p>
              
              <h3 className="text-lg font-semibold mt-4 mb-2 text-stone-800">Account Information</h3>
              <ul>
                <li>Name and email address (required to create an account)</li>
                <li>Password (securely hashed — we never see your actual password)</li>
                <li>OAuth data if you sign up with GitHub or Google (profile info they share)</li>
              </ul>

              <h3 className="text-lg font-semibold mt-4 mb-2 text-stone-800">Payment Information</h3>
              <ul>
                <li>Billing details and payment method (processed by Stripe — we don&apos;t store your card numbers)</li>
                <li>Payout information for hosts (bank account or Stripe Connect details)</li>
              </ul>

              <h3 className="text-lg font-semibold mt-4 mb-2 text-stone-800">Host Machine Information</h3>
              <ul>
                <li>Hardware specs (CPU, RAM, storage, GPU if applicable)</li>
                <li>Connection quality and uptime metrics</li>
                <li>Geographic region (for latency optimization, not precise location)</li>
              </ul>

              <h3 className="text-lg font-semibold mt-4 mb-2 text-stone-800">Usage Data</h3>
              <ul>
                <li>Agent deployment and usage statistics</li>
                <li>Performance metrics and error logs</li>
                <li>Feature usage patterns to improve the platform</li>
              </ul>
            </Section>

            <Section title="How We Use Your Information">
              <p>We use your information to:</p>
              <ul>
                <li><strong>Provide the service:</strong> Match deployers with hosts, manage deployments, handle authentication</li>
                <li><strong>Process payments:</strong> Handle subscriptions, calculate host payouts, manage billing</li>
                <li><strong>Communicate with you:</strong> Send transactional emails (verification, password resets, payment confirmations)</li>
                <li><strong>Improve Sparebox:</strong> Understand usage patterns, fix bugs, build better features</li>
                <li><strong>Maintain security:</strong> Detect abuse, prevent fraud, protect the network</li>
              </ul>
              <p className="mt-4">
                We <strong>don&apos;t</strong> sell your data. We <strong>don&apos;t</strong> use your information for targeted advertising. 
                We <strong>don&apos;t</strong> share your personal information with third parties for their own marketing purposes.
              </p>
            </Section>

            <Section title="Third-Party Services">
              <p>We use a few trusted services to run Sparebox:</p>
              <ul>
                <li><strong>Stripe</strong> — Payment processing. They have their own <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:text-orange-700">privacy policy</a>.</li>
                <li><strong>Resend</strong> — Transactional email delivery (verification emails, password resets).</li>
                <li><strong>Vercel</strong> — Web hosting and infrastructure.</li>
                <li><strong>Supabase</strong> — Database hosting (your data is encrypted at rest).</li>
              </ul>
              <p className="mt-4">
                These services only receive the minimum information needed to do their job.
              </p>
            </Section>

            <Section title="Cookies">
              <p>
                We use <strong>session cookies only</strong> — small files that keep you logged in while you use Sparebox. 
                These are essential cookies, not tracking cookies.
              </p>
              <p className="mt-2">
                We don&apos;t use analytics trackers, advertising pixels, or third-party cookies. 
                When you browse Sparebox, you&apos;re not being tracked across the web.
              </p>
            </Section>

            <Section title="Data Retention">
              <p>We keep your data for as long as you have an account with us. When you delete your account:</p>
              <ul>
                <li>Your personal information is deleted within 30 days</li>
                <li>Some anonymized usage data may be retained for analytics</li>
                <li>We may retain certain records as required by law (e.g., payment records for tax purposes)</li>
              </ul>
            </Section>

            <Section title="Your Rights">
              <p>You have control over your data:</p>
              <ul>
                <li><strong>Access:</strong> You can view and export your data from your account settings</li>
                <li><strong>Correction:</strong> You can update your information at any time</li>
                <li><strong>Deletion:</strong> You can delete your account, and we&apos;ll remove your data</li>
                <li><strong>Portability:</strong> You can request a copy of your data in a standard format</li>
              </ul>
              <p className="mt-4">
                To exercise any of these rights, email us at{" "}
                <a href="mailto:support@sparebox.dev" className="text-orange-600 hover:text-orange-700">
                  support@sparebox.dev
                </a>.
              </p>
            </Section>

            <Section title="Children's Privacy">
              <p>
                Sparebox is not intended for anyone under 18 years old. We don&apos;t knowingly collect 
                information from minors. If you believe a child has provided us with personal information, 
                please contact us and we&apos;ll delete it.
              </p>
            </Section>

            <Section title="Security">
              <p>
                We take security seriously. Your data is encrypted in transit (HTTPS everywhere) and at rest. 
                We use industry-standard security practices, regular security reviews, and limit access to 
                personal data to those who need it.
              </p>
              <p className="mt-2">
                That said, no system is 100% secure. If we ever experience a data breach that affects you, 
                we&apos;ll notify you promptly.
              </p>
            </Section>

            <Section title="Changes to This Policy">
              <p>
                We may update this policy from time to time. If we make significant changes, we&apos;ll let you 
                know via email or a notice on our website. The &quot;Last updated&quot; date at the top tells you 
                when we last made changes.
              </p>
            </Section>

            <Section title="Contact Us">
              <p>
                Questions about this policy? Concerns about your data? Just want to say hi?
              </p>
              <p className="mt-2">
                Email us at{" "}
                <a href="mailto:support@sparebox.dev" className="text-orange-600 hover:text-orange-700">
                  support@sparebox.dev
                </a>
              </p>
            </Section>
          </div>

          <div className="mt-12 pt-8 border-t border-stone-200">
            <p className="text-sm text-stone-500">
              See also:{" "}
              <Link href="/terms-of-service" className="text-orange-600 hover:text-orange-700">
                Terms of Service
              </Link>
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-stone-200 bg-white/50 py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <SpareboxLogo variant="full" size="sm" />
          </div>
          <div className="flex items-center gap-6">
            <Link href="/privacy-policy" className="text-stone-500 hover:text-stone-700 text-sm transition">
              Privacy Policy
            </Link>
            <Link href="/terms-of-service" className="text-stone-500 hover:text-stone-700 text-sm transition">
              Terms of Service
            </Link>
          </div>
          <p className="text-stone-500 text-sm">
            © 2026 Sparebox
          </p>
        </div>
      </footer>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-2xl font-bold mb-4 text-stone-900">{title}</h2>
      <div className="text-stone-600 leading-relaxed space-y-2">{children}</div>
    </section>
  );
}
