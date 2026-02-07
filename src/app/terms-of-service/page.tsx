import Link from "next/link";
import { SpareboxLogo } from "@/components/sparebox-logo";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service - Sparebox",
  description: "The terms and conditions for using the Sparebox platform.",
};

export default function TermsOfServicePage() {
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
          <h1 className="text-4xl font-bold mb-8 tracking-tight text-stone-900">Terms of Service</h1>

          <div className="prose prose-stone max-w-none">
            <p className="text-lg text-stone-600 mb-8">
              Welcome to Sparebox! These terms govern your use of our platform. By using Sparebox, 
              you agree to these terms. We&apos;ve written them in plain English so you can actually understand 
              what you&apos;re agreeing to.
            </p>

            <Section title="What Sparebox Is">
              <p>
                Sparebox is a peer-to-peer marketplace that connects people with spare computing hardware (&quot;Hosts&quot;) 
                with people who want to deploy AI agents (&quot;Deployers&quot;). We&apos;re the platform that makes this 
                connection possible — we handle payments, provide the software, and maintain the network.
              </p>
              <p className="mt-2">
                Think of us like Airbnb, but for compute power instead of apartments. Hosts provide the hardware. 
                Deployers run their agents. We facilitate the transaction.
              </p>
            </Section>

            <Section title="Who Can Use Sparebox">
              <p>To use Sparebox, you must:</p>
              <ul>
                <li>Be at least 18 years old</li>
                <li>Be able to form a binding contract</li>
                <li>Not be prohibited from using our services under applicable law</li>
                <li>Provide accurate information when creating your account</li>
              </ul>
            </Section>

            <Section title="Your Account">
              <p>
                You&apos;re responsible for your account. Keep your password secure, and don&apos;t share your 
                credentials with others. If you think someone has accessed your account without permission, 
                let us know immediately.
              </p>
              <p className="mt-2">
                One account per person. Don&apos;t create multiple accounts to game the system.
              </p>
            </Section>

            <Section title="For Hosts">
              <p>If you&apos;re providing compute resources on Sparebox, you agree to:</p>
              <ul>
                <li><strong>Provide what you promise:</strong> Your machine specs should be accurate. Don&apos;t oversell your hardware.</li>
                <li><strong>Maintain reasonable uptime:</strong> Deployers are paying for availability. Frequent outages aren&apos;t fair to them.</li>
                <li><strong>Keep things secure:</strong> Run our host software as instructed. Don&apos;t tamper with deployed agents or access deployer data.</li>
                <li><strong>No illegal content:</strong> Don&apos;t use your host status to facilitate illegal activities.</li>
                <li><strong>Have the right to offer your hardware:</strong> Make sure you can legally use the machine for this purpose.</li>
              </ul>
              <p className="mt-4">
                You earn 60% of the subscription fees from deployers using your hardware. Payouts are processed 
                monthly via Stripe. You&apos;re responsible for any taxes on your earnings.
              </p>
            </Section>

            <Section title="For Deployers">
              <p>If you&apos;re deploying AI agents on Sparebox, you agree to:</p>
              <ul>
                <li><strong>Deploy legitimate agents:</strong> Your agents should do what they claim to do.</li>
                <li><strong>Respect host resources:</strong> Don&apos;t abuse the hardware you&apos;re renting. Don&apos;t try to use more resources than you&apos;re paying for.</li>
                <li><strong>No illegal activities:</strong> Don&apos;t use Sparebox for anything illegal.</li>
                <li><strong>Pay your bills:</strong> Subscriptions are billed monthly. Failed payments may result in agent suspension.</li>
              </ul>
            </Section>

            <Section title="Prohibited Uses">
              <p>The following are not allowed on Sparebox, full stop:</p>
              <ul>
                <li><strong>Illegal activities:</strong> Anything that violates laws in your jurisdiction or ours.</li>
                <li><strong>Crypto mining:</strong> Don&apos;t disguise mining as AI agents. We&apos;ll notice.</li>
                <li><strong>Abuse of hosts:</strong> Attempting to compromise host machines, access other tenants&apos; data, or exploit vulnerabilities.</li>
                <li><strong>Malicious agents:</strong> Malware, botnets, spam operations, or anything designed to harm others.</li>
                <li><strong>Fraud:</strong> Fake accounts, payment fraud, or misrepresenting yourself or your agents.</li>
                <li><strong>Platform abuse:</strong> Circumventing our systems, scraping, or interfering with normal operations.</li>
                <li><strong>Harassment:</strong> Using the platform to harass, stalk, or harm other users.</li>
              </ul>
              <p className="mt-4">
                We reserve the right to suspend or terminate accounts that violate these rules. Severe violations 
                may be reported to law enforcement.
              </p>
            </Section>

            <Section title="Payments">
              <p>
                All payments are processed through Stripe. By using Sparebox, you agree to{" "}
                <a href="https://stripe.com/legal" target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:text-orange-700">
                  Stripe&apos;s terms of service
                </a>.
              </p>
              <h3 className="text-lg font-semibold mt-4 mb-2 text-stone-800">For Deployers</h3>
              <ul>
                <li>Subscriptions are billed monthly in advance</li>
                <li>Prices are listed in USD</li>
                <li>You can cancel anytime; service continues until the end of your billing period</li>
                <li>Refunds are handled on a case-by-case basis</li>
              </ul>
              <h3 className="text-lg font-semibold mt-4 mb-2 text-stone-800">For Hosts</h3>
              <ul>
                <li>You receive 60% of subscription revenue from agents running on your hardware</li>
                <li>Sparebox retains 40% for platform operations</li>
                <li>Payouts are processed monthly via Stripe Connect</li>
                <li>You&apos;re responsible for reporting and paying any applicable taxes</li>
              </ul>
            </Section>

            <Section title="Service Availability">
              <p>
                We do our best to keep Sparebox running smoothly, but we can&apos;t guarantee 100% uptime. 
                This is a peer-to-peer network — individual hosts may go offline, and sometimes things break.
              </p>
              <p className="mt-2">
                <strong>During beta:</strong> We&apos;re still building. Expect bugs, changes, and occasional 
                downtime. We don&apos;t offer SLA guarantees during this period. We appreciate your patience 
                and feedback as we improve.
              </p>
              <p className="mt-2">
                We may modify, suspend, or discontinue any part of the service at any time. We&apos;ll try to 
                give reasonable notice for significant changes.
              </p>
            </Section>

            <Section title="Limitation of Liability">
              <p>
                Sparebox is provided &quot;as is.&quot; To the maximum extent permitted by law:
              </p>
              <ul>
                <li>We don&apos;t warrant that the service will be uninterrupted or error-free</li>
                <li>We&apos;re not liable for any indirect, incidental, or consequential damages</li>
                <li>Our total liability is limited to the amount you&apos;ve paid us in the last 12 months</li>
                <li>We&apos;re not responsible for the actions of hosts, deployers, or their agents</li>
              </ul>
              <p className="mt-4">
                We&apos;re a marketplace. Hosts and deployers interact through our platform, but we&apos;re not 
                responsible for what happens between them beyond providing a fair and secure platform.
              </p>
            </Section>

            <Section title="Termination">
              <p>
                <strong>You can leave anytime:</strong> Delete your account from your settings. Active subscriptions 
                will continue until the end of the billing period, then you&apos;re done.
              </p>
              <p className="mt-2">
                <strong>We can terminate accounts:</strong> If you violate these terms, abuse the platform, or 
                engage in prohibited activities, we may suspend or terminate your account. We&apos;ll try to 
                give notice when possible, but reserve the right to act immediately for severe violations.
              </p>
              <p className="mt-2">
                Upon termination, your right to use Sparebox ends. Data deletion follows our{" "}
                <Link href="/privacy-policy" className="text-orange-600 hover:text-orange-700">
                  Privacy Policy
                </Link>.
              </p>
            </Section>

            <Section title="Intellectual Property">
              <p>
                <strong>Sparebox owns Sparebox:</strong> Our software, branding, and platform are our intellectual 
                property. You can&apos;t copy, modify, or reverse-engineer our stuff.
              </p>
              <p className="mt-2">
                <strong>You own your agents:</strong> Deployers retain all rights to their AI agents and any 
                content they create. We don&apos;t claim ownership of your work.
              </p>
              <p className="mt-2">
                <strong>License to use:</strong> By deploying agents on Sparebox, you grant us a limited license 
                to host and run them. This is just what&apos;s needed to provide the service — we&apos;re not 
                claiming any broader rights.
              </p>
            </Section>

            <Section title="Disputes">
              <p>
                If you have a dispute with another user (host vs. deployer), try to resolve it directly first. 
                If you need help, contact us at{" "}
                <a href="mailto:support@sparebox.dev" className="text-orange-600 hover:text-orange-700">
                  support@sparebox.dev
                </a>{" "}
                and we&apos;ll do our best to help mediate.
              </p>
              <p className="mt-2">
                If you have a dispute with Sparebox itself, let&apos;s try to work it out. Email us, and we&apos;ll 
                respond within a reasonable timeframe. If we can&apos;t resolve it informally, any legal action 
                will be governed by the laws of the jurisdiction in which Sparebox operates.
              </p>
            </Section>

            <Section title="Changes to These Terms">
              <p>
                We may update these terms from time to time. If we make significant changes, we&apos;ll notify 
                you via email or a notice on the platform. Continuing to use Sparebox after changes take effect 
                means you accept the new terms.
              </p>
              <p className="mt-2">
                The &quot;Last updated&quot; date at the top tells you when we last made changes.
              </p>
            </Section>

            <Section title="Contact Us">
              <p>
                Questions? Concerns? Feedback on these terms?
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
              <Link href="/privacy-policy" className="text-orange-600 hover:text-orange-700">
                Privacy Policy
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
