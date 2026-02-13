"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import Link from "next/link";
import { Server, Plus, Trash2, Settings, BookOpen, ChevronDown, ChevronUp, Terminal } from "lucide-react";

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: "status-success",
    pending: "status-warning",
    inactive: "bg-muted text-muted-foreground",
    suspended: "status-error",
  };

  const dotColors: Record<string, string> = {
    active: "bg-green-500",
    pending: "bg-amber-500",
    inactive: "bg-muted-foreground",
    suspended: "bg-red-500",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${
        colors[status] || colors.pending
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${dotColors[status] || dotColors.pending}`}
      />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">
      {children}
    </code>
  );
}

function DaemonManagementGuide() {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-card border border-border rounded-xl mt-8">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-6 text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-foreground">
              Daemon Management Guide
            </h3>
            <p className="text-sm text-muted-foreground">
              Installation, configuration, and troubleshooting
            </p>
          </div>
        </div>
        {open ? (
          <ChevronUp className="w-5 h-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        )}
      </button>

      {open && (
        <div className="px-6 pb-6 space-y-6 border-t border-border pt-6">
          {/* Installation */}
          <section>
            <div className="flex items-center gap-2 mb-2">
              <Terminal className="w-4 h-4 text-primary" />
              <h4 className="font-semibold text-foreground">Installation</h4>
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              Run the installer on any Linux or macOS machine with Node.js 20+:
            </p>
            <div className="bg-muted rounded-lg p-3">
              <code className="text-sm font-mono text-foreground">
                curl -fsSL https://www.sparebox.dev/api/install | bash
              </code>
            </div>
          </section>

          {/* Starting */}
          <section>
            <h4 className="font-semibold text-foreground mb-2">Starting</h4>
            <p className="text-sm text-muted-foreground mb-2">
              Start the daemon in the foreground (logs to stdout):
            </p>
            <div className="bg-muted rounded-lg p-3">
              <code className="text-sm font-mono text-foreground">
                node ~/.sparebox/sparebox-daemon.cjs
              </code>
            </div>
          </section>

          {/* Running in Background */}
          <section>
            <h4 className="font-semibold text-foreground mb-2">
              Running in Background
            </h4>
            <p className="text-sm text-muted-foreground mb-2">
              Run detached with output redirected to a log file:
            </p>
            <div className="bg-muted rounded-lg p-3">
              <code className="text-sm font-mono text-foreground">
                node ~/.sparebox/sparebox-daemon.cjs &gt; ~/.sparebox/daemon.log 2&gt;&amp;1 &amp;
              </code>
            </div>
          </section>

          {/* Stopping */}
          <section>
            <h4 className="font-semibold text-foreground mb-2">Stopping</h4>
            <p className="text-sm text-muted-foreground">
              Using the PID file: <Code>kill $(cat ~/.sparebox/daemon.pid)</Code>
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Or by name: <Code>pkill -f sparebox-daemon</Code>
            </p>
          </section>

          {/* Checking Status */}
          <section>
            <h4 className="font-semibold text-foreground mb-2">
              Checking Status
            </h4>
            <p className="text-sm text-muted-foreground mb-2">
              Verify the daemon can connect to Sparebox:
            </p>
            <div className="bg-muted rounded-lg p-3">
              <code className="text-sm font-mono text-foreground">
                node ~/.sparebox/sparebox-daemon.cjs --verify
              </code>
            </div>
          </section>

          {/* Updating */}
          <section>
            <h4 className="font-semibold text-foreground mb-2">Updating</h4>
            <p className="text-sm text-muted-foreground">
              Re-run the install command. It will download the latest daemon and
              keep your existing config.
            </p>
          </section>

          {/* Configuration */}
          <section>
            <h4 className="font-semibold text-foreground mb-2">
              Configuration
            </h4>
            <p className="text-sm text-muted-foreground mb-2">
              Edit <Code>~/.sparebox/config.json</Code>:
            </p>
            <div className="bg-muted rounded-lg p-3 text-sm font-mono text-foreground whitespace-pre">
{`{
  "apiKey": "sbx_host_...",
  "hostId": "your-uuid",
  "apiUrl": "https://www.sparebox.dev",
  "heartbeatIntervalMs": 60000
}`}
            </div>
          </section>

          {/* Auto-start on Boot (Linux) */}
          <section>
            <h4 className="font-semibold text-foreground mb-2">
              Auto-start on Boot (Linux)
            </h4>
            <p className="text-sm text-muted-foreground mb-2">
              Create a systemd user service at{" "}
              <Code>~/.config/systemd/user/sparebox-daemon.service</Code>:
            </p>
            <div className="bg-muted rounded-lg p-3 text-sm font-mono text-foreground whitespace-pre">
{`[Unit]
Description=Sparebox Host Daemon
After=network-online.target

[Service]
ExecStart=/usr/bin/node %h/.sparebox/sparebox-daemon.cjs
Restart=always
RestartSec=10

[Install]
WantedBy=default.target`}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Then run: <Code>systemctl --user daemon-reload && systemctl --user enable --now sparebox-daemon</Code>
            </p>
          </section>

          {/* Auto-start on Boot (macOS) */}
          <section>
            <h4 className="font-semibold text-foreground mb-2">
              Auto-start on Boot (macOS)
            </h4>
            <p className="text-sm text-muted-foreground mb-2">
              Create a plist at{" "}
              <Code>~/Library/LaunchAgents/dev.sparebox.daemon.plist</Code> with{" "}
              <Code>ProgramArguments</Code> set to{" "}
              <Code>[&quot;/usr/local/bin/node&quot;, &quot;~/.sparebox/sparebox-daemon.cjs&quot;]</Code>,{" "}
              <Code>RunAtLoad</Code> true, and <Code>KeepAlive</Code> true.
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Load with: <Code>launchctl load ~/Library/LaunchAgents/dev.sparebox.daemon.plist</Code>
            </p>
          </section>

          {/* Logs */}
          <section>
            <h4 className="font-semibold text-foreground mb-2">Logs</h4>
            <p className="text-sm text-muted-foreground">
              If running in the foreground, logs print to stdout. If
              backgrounded with a log file:
            </p>
            <div className="bg-muted rounded-lg p-3 mt-2">
              <code className="text-sm font-mono text-foreground">
                tail -f ~/.sparebox/daemon.log
              </code>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              If using systemd: <Code>journalctl --user -u sparebox-daemon -f</Code>
            </p>
          </section>

          {/* Troubleshooting */}
          <section>
            <h4 className="font-semibold text-foreground mb-2">
              Troubleshooting
            </h4>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li>
                <strong>Node.js not found:</strong> Install Node.js 20+ from{" "}
                <a
                  href="https://nodejs.org"
                  className="text-primary hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  nodejs.org
                </a>{" "}
                or via your package manager.
              </li>
              <li>
                <strong>Wrong API key:</strong> Re-check your API key on the{" "}
                dashboard above. It should start with{" "}
                <Code>sbx_host_</Code>.
              </li>
              <li>
                <strong>Firewall blocking connections:</strong> The daemon needs
                outbound HTTPS (port 443) to{" "}
                <Code>www.sparebox.dev</Code>. Ensure your firewall allows it.
              </li>
              <li>
                <strong>Daemon exits immediately:</strong> Run in the foreground
                to see error output. Check that <Code>config.json</Code>{" "}
                is valid JSON.
              </li>
            </ul>
          </section>
        </div>
      )}
    </div>
  );
}

export default function HostsPage() {
  const { data: hosts, isLoading, refetch } = trpc.hosts.list.useQuery();
  const deleteHost = trpc.hosts.delete.useMutation({
    onSuccess: () => refetch(),
  });

  const handleDelete = async (id: string) => {
    if (
      confirm(
        "Are you sure you want to delete this machine? This cannot be undone."
      )
    ) {
      await deleteHost.mutateAsync({ id });
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Machines</h1>
          <p className="text-muted-foreground mt-1">
            Manage your registered hardware
          </p>
        </div>
        <Link
          href="/dashboard/hosts/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Machine
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-card border border-border rounded-xl p-6 h-32 animate-pulse"
            />
          ))}
        </div>
      ) : !hosts || hosts.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center mx-auto mb-4">
            <Server className="w-6 h-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">
            No machines registered yet
          </h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
            Add your first machine to start earning. You'll need to install our
            lightweight agent software to get started.
          </p>
          <Link
            href="/dashboard/hosts/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Machine
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {hosts.map((host) => (
            <div
              key={host.id}
              className="bg-card border border-border rounded-xl p-6"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <StatusBadge status={host.status} />
                    <Link
                      href={`/dashboard/hosts/${host.id}`}
                      className="font-semibold text-foreground hover:text-primary transition-colors"
                    >
                      {host.name}
                    </Link>
                  </div>

                  <p className="text-sm text-muted-foreground mt-2">
                    {host.cpuCores} cores • {host.ramGb}GB RAM •{" "}
                    {host.city || host.region || "Unknown location"}
                  </p>

                  <div className="flex items-center gap-4 mt-3 text-sm">
                    <span className="text-primary font-medium">
                      ${((host.pricePerMonth || 0) / 100).toFixed(2)}/mo
                    </span>
                    <span className="text-muted-foreground">
                      {host.uptimePercent?.toFixed(1)}% uptime
                    </span>
                    <span className="text-muted-foreground">
                      Last heartbeat:{" "}
                      {host.lastHeartbeat
                        ? new Date(host.lastHeartbeat).toLocaleString()
                        : "Never"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/dashboard/hosts/${host.id}`}
                    className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
                    title="Manage"
                  >
                    <Settings className="w-4 h-4" />
                  </Link>
                  <button
                    onClick={() => handleDelete(host.id)}
                    disabled={deleteHost.isPending}
                    className="p-2 text-muted-foreground hover:text-destructive hover:bg-accent rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <DaemonManagementGuide />
    </div>
  );
}
