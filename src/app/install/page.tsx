import Link from "next/link";
import type { Metadata } from "next";
import { SpareboxLogo } from "@/components/sparebox-logo";

export const metadata: Metadata = {
  title: "Install Host Daemon — Sparebox",
  description:
    "Install the Sparebox host daemon to start hosting AI agents on your hardware. Supports Linux, macOS, and Windows.",
  openGraph: {
    title: "Install Sparebox Host Daemon",
    description:
      "Install the Sparebox host daemon to start hosting AI agents on your hardware.",
    url: "https://sparebox.dev/install",
    siteName: "Sparebox",
  },
};

function CodeBlock({
  children,
  language = "bash",
}: {
  children: string;
  language?: string;
}) {
  return (
    <div className="relative group">
      <pre className="bg-stone-900 text-stone-100 rounded-xl px-5 py-4 text-sm font-mono overflow-x-auto">
        <code>{children}</code>
      </pre>
    </div>
  );
}

function StepCard({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-600 text-white flex items-center justify-center text-sm font-bold">
        {number}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-lg font-semibold text-stone-900 mb-2">{title}</h3>
        <div className="text-stone-600 space-y-3">{children}</div>
      </div>
    </div>
  );
}

export default function InstallPage() {
  return (
    <div className="min-h-screen bg-amber-50 text-stone-900">
      <div className="fixed inset-0 bg-gradient-to-b from-orange-50 via-amber-50 to-amber-100/50 pointer-events-none" />

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-4 max-w-4xl mx-auto">
        <SpareboxLogo variant="full" size="md" href="/" />
        <div className="flex items-center gap-4">
          <Link
            href="/blog"
            className="text-stone-600 hover:text-stone-900 transition"
          >
            Blog
          </Link>
          <Link
            href="/login"
            className="text-stone-600 hover:text-stone-900 transition"
          >
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
      <main className="relative z-10 max-w-4xl mx-auto px-6 pt-12 pb-32">
        <h1 className="text-4xl font-bold mb-4 text-stone-900 tracking-tight">
          Install the Host Daemon
        </h1>
        <p className="text-xl text-stone-500 mb-12 max-w-2xl">
          Get your machine connected to Sparebox in under 5 minutes.
        </p>

        {/* Prerequisites */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Prerequisites</h2>
          <ul className="space-y-2 text-stone-600">
            <li className="flex items-center gap-2">
              <span className="w-5 h-5 bg-orange-100 text-orange-700 rounded-full flex items-center justify-center text-xs font-bold">
                ✓
              </span>
              <strong>Node.js 20+</strong> — Install from{" "}
              <a
                href="https://nodejs.org"
                className="text-orange-600 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                nodejs.org
              </a>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-5 h-5 bg-orange-100 text-orange-700 rounded-full flex items-center justify-center text-xs font-bold">
                ✓
              </span>
              <strong>Sparebox account</strong> — with a registered machine
            </li>
            <li className="flex items-center gap-2">
              <span className="w-5 h-5 bg-orange-100 text-orange-700 rounded-full flex items-center justify-center text-xs font-bold">
                ✓
              </span>
              <strong>Network access</strong> — outbound HTTPS to sparebox.dev
            </li>
          </ul>
        </div>

        {/* Steps */}
        <div className="space-y-10 mb-12">
          <StepCard number={1} title="Register your machine">
            <p>
              Go to your{" "}
              <Link
                href="/dashboard/hosts/new"
                className="text-orange-600 hover:underline font-medium"
              >
                Sparebox dashboard
              </Link>{" "}
              and add a new machine. Enter your hardware specs and set your monthly
              price.
            </p>
            <p>
              After creation, you&apos;ll receive an <strong>API Key</strong> and{" "}
              <strong>Host ID</strong>. Keep these handy.
            </p>
          </StepCard>

          <StepCard number={2} title="Install the daemon">
            <p className="font-medium text-stone-800">Linux / macOS:</p>
            <CodeBlock>
              {`curl -fsSL https://www.sparebox.dev/api/install | bash`}
            </CodeBlock>

            <p className="font-medium text-stone-800 mt-4">Windows (PowerShell):</p>
            <CodeBlock language="powershell">
              {`irm https://www.sparebox.dev/api/install/windows | iex`}
            </CodeBlock>

            <p className="font-medium text-stone-800 mt-4">
              Manual install (any platform):
            </p>
            <CodeBlock>
              {`git clone https://github.com/clawclawioff/sparebox.git
cd sparebox/daemon
npm run build
node dist/index.js --verify`}
            </CodeBlock>
          </StepCard>

          <StepCard number={3} title="Configure">
            <p>
              The installer will prompt for your API Key and Host ID. You can also
              configure via environment variables:
            </p>
            <CodeBlock>
              {`export SPAREBOX_API_KEY="sbx_host_your_key_here"
export SPAREBOX_HOST_ID="your-host-uuid-here"`}
            </CodeBlock>
            <p>
              Or create a config file at <code className="bg-stone-100 px-1.5 py-0.5 rounded text-sm">~/.sparebox/config.json</code>:
            </p>
            <CodeBlock language="json">
              {`{
  "apiKey": "sbx_host_your_key_here",
  "hostId": "your-host-uuid",
  "apiUrl": "https://www.sparebox.dev",
  "heartbeatIntervalMs": 60000
}`}
            </CodeBlock>
          </StepCard>

          <StepCard number={4} title="Start the daemon">
            <p>If you set up the systemd service, it&apos;s already running. Otherwise:</p>
            <CodeBlock>{`node ~/.sparebox/dist/index.js`}</CodeBlock>
            <p>
              The daemon will send a heartbeat every 60 seconds. Check your{" "}
              <Link
                href="/dashboard/hosts"
                className="text-orange-600 hover:underline font-medium"
              >
                dashboard
              </Link>{" "}
              to confirm the connection.
            </p>
          </StepCard>

          <StepCard number={5} title="Verify">
            <p>Run the verify command to check everything is configured correctly:</p>
            <CodeBlock>{`node ~/.sparebox/dist/index.js --verify`}</CodeBlock>
            <p>
              You should see green checkmarks for config and system metrics. Your
              machine will show as <strong className="text-green-600">&quot;Active&quot;</strong> in the
              dashboard once the first heartbeat is received.
            </p>
          </StepCard>
        </div>

        {/* Troubleshooting */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Troubleshooting</h2>
          <div className="space-y-4 text-stone-600">
            <div>
              <p className="font-medium text-stone-800">
                Daemon says &quot;Authentication failed&quot;
              </p>
              <p>
                Check that your API key is correct and hasn&apos;t been revoked. You can
                regenerate it from the host details page in the dashboard.
              </p>
            </div>
            <div>
              <p className="font-medium text-stone-800">
                Machine shows as &quot;Inactive&quot; in dashboard
              </p>
              <p>
                The platform marks machines inactive if no heartbeat is received for
                5 minutes. Check that the daemon is running:{" "}
                <code className="bg-stone-100 px-1.5 py-0.5 rounded text-sm">
                  systemctl --user status sparebox-daemon
                </code>
              </p>
            </div>
            <div>
              <p className="font-medium text-stone-800">
                Heartbeats failing with connection errors
              </p>
              <p>
                Ensure your machine has outbound HTTPS access to{" "}
                <code className="bg-stone-100 px-1.5 py-0.5 rounded text-sm">
                  www.sparebox.dev
                </code>
                . The daemon uses exponential backoff and will retry automatically.
              </p>
            </div>
          </div>
        </div>

        {/* System service reference */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6">
          <h2 className="text-xl font-semibold mb-4">Running as a Service</h2>
          <div className="space-y-4 text-stone-600">
            <div>
              <p className="font-medium text-stone-800">Linux (systemd)</p>
              <CodeBlock>
                {`# Check status
systemctl --user status sparebox-daemon

# View logs
journalctl --user -u sparebox-daemon -f

# Restart
systemctl --user restart sparebox-daemon

# Stop
systemctl --user stop sparebox-daemon`}
              </CodeBlock>
            </div>
            <div>
              <p className="font-medium text-stone-800 mt-4">Windows (Task Scheduler)</p>
              <CodeBlock language="powershell">
                {`# Check status
Get-ScheduledTask -TaskName SpareboxDaemon

# Stop
Stop-ScheduledTask -TaskName SpareboxDaemon

# Remove
Unregister-ScheduledTask -TaskName SpareboxDaemon -Confirm:$false`}
              </CodeBlock>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-stone-200 bg-white/50 py-8">
        <div className="max-w-4xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <SpareboxLogo variant="full" size="sm" />
          <p className="text-stone-500 text-sm">
            © 2026 Sparebox. Open infrastructure for personal AI.
          </p>
        </div>
      </footer>
    </div>
  );
}
