"use client";

import { trpc } from "@/lib/trpc";
import Link from "next/link";
import { useState } from "react";
import { Server, MapPin, Cpu, HardDrive, Activity } from "lucide-react";
import { TIERS, type TierKey } from "@/lib/constants";

function LastSeenBadge({ lastHeartbeat }: { lastHeartbeat: Date | string | null | undefined }) {
  if (!lastHeartbeat) return null;

  const lastBeat = new Date(lastHeartbeat);
  const diffMs = Date.now() - lastBeat.getTime();
  const minutesAgo = Math.floor(diffMs / 60000);

  // Online: heartbeat within last 5 minutes
  if (minutesAgo < 5) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-600">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
        Online
      </span>
    );
  }

  // Stale: format relative time
  let relativeTime: string;
  if (minutesAgo < 60) {
    relativeTime = `${minutesAgo}m ago`;
  } else if (minutesAgo < 1440) {
    const hours = Math.floor(minutesAgo / 60);
    relativeTime = `${hours}h ago`;
  } else {
    const days = Math.floor(minutesAgo / 1440);
    relativeTime = `${days}d ago`;
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-600">
      <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
      Last seen {relativeTime}
    </span>
  );
}

function IsolationBadge({ mode }: { mode: string | null | undefined }) {
  if (!mode || mode === "unknown") return null;

  if (mode === "docker") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-600">
        🐳 Docker
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-600">
      ⚠️ Limited
    </span>
  );
}

function TierPriceChips({ host }: { host: Record<string, unknown> }) {
  const tierKeys: TierKey[] = ["lite", "standard", "pro", "compute"];
  const priceFields: Record<TierKey, string> = {
    lite: "priceLite",
    standard: "priceStandard",
    pro: "pricePro",
    compute: "priceCompute",
  };

  const available = tierKeys.filter((t) => {
    const val = host[priceFields[t]];
    return typeof val === "number" && val > 0;
  });

  if (available.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 mt-3">
      {available.map((tier) => {
        const price = host[priceFields[tier]] as number;
        return (
          <span
            key={tier}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-foreground border border-border"
          >
            {TIERS[tier].name}:{" "}
            <span className="text-primary">${(price / 100).toFixed(0)}/mo</span>
          </span>
        );
      })}
    </div>
  );
}

export default function BrowseHostsPage() {
  const [region, setRegion] = useState<string>("");
  const [minRam, setMinRam] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");

  const { data: hosts, isLoading } = trpc.hosts.listAvailable.useQuery({
    region: region || undefined,
    minRam: minRam ? parseInt(minRam) : undefined,
    maxPrice: maxPrice ? parseInt(maxPrice) * 100 : undefined, // convert dollars to cents
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Browse Hosts</h1>
        <p className="text-muted-foreground mt-1">
          Find the perfect host for your AI agent
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <select 
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          className="bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Any Region</option>
          <option value="us-east">US East</option>
          <option value="us-west">US West</option>
          <option value="eu-west">EU West</option>
          <option value="eu-central">EU Central</option>
          <option value="asia-pacific">Asia Pacific</option>
        </select>
        <select 
          value={minRam}
          onChange={(e) => setMinRam(e.target.value)}
          className="bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Any RAM</option>
          <option value="8">8GB+</option>
          <option value="16">16GB+</option>
          <option value="32">32GB+</option>
          <option value="64">64GB+</option>
        </select>
        <select 
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)}
          className="bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Any Price</option>
          <option value="10">Under $10/mo</option>
          <option value="20">Under $20/mo</option>
          <option value="50">Under $50/mo</option>
          <option value="100">Under $100/mo</option>
        </select>
        {(region || minRam || maxPrice) && (
          <button
            onClick={() => { setRegion(""); setMinRam(""); setMaxPrice(""); }}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-2"
          >
            Clear filters
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="grid gap-4">
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
            No hosts available yet
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Check back soon — hosts are being onboarded.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{hosts.length} hosts available</p>
          <div className="grid gap-4">
            {hosts.map((host) => {
              const hostAny = host as unknown as Record<string, unknown>;
              const isolationMode = hostAny.isolationMode as string | null | undefined;
              const maxAgents = hostAny.maxAgents as number | null | undefined;
              const hostedAgentCount = Array.isArray(hostAny.agents)
                ? (hostAny.agents as unknown[]).length
                : null;

              return (
                <div
                  key={host.id}
                  className="bg-card border border-border rounded-xl p-6 hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="font-semibold text-foreground text-lg">
                          {host.name}
                        </h3>
                        <span className="text-primary font-semibold">
                          ${((host.pricePerMonth || 0) / 100).toFixed(0)}/mo
                        </span>
                        <LastSeenBadge lastHeartbeat={(host as any).lastHeartbeat} />
                        <IsolationBadge mode={isolationMode} />
                      </div>
                      
                      {host.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {host.description}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-muted-foreground">
                        {host.cpuCores && (
                          <span className="flex items-center gap-1.5">
                            <Cpu className="w-4 h-4" />
                            {host.cpuCores} cores
                          </span>
                        )}
                        {host.ramGb && (
                          <span className="flex items-center gap-1.5">
                            <Server className="w-4 h-4" />
                            {host.ramGb}GB RAM
                          </span>
                        )}
                        {host.storageGb && (
                          <span className="flex items-center gap-1.5">
                            <HardDrive className="w-4 h-4" />
                            {host.storageGb}GB
                          </span>
                        )}
                        {(host.city || host.region || host.country) && (
                          <span className="flex items-center gap-1.5">
                            <MapPin className="w-4 h-4" />
                            {[host.city, host.region, host.country]
                              .filter(Boolean)
                              .join(", ")}
                          </span>
                        )}
                        {host.uptimePercent && (
                          <span className="flex items-center gap-1.5">
                            <Activity className="w-4 h-4" />
                            {host.uptimePercent.toFixed(1)}% uptime
                          </span>
                        )}
                        {maxAgents && maxAgents > 0 && (
                          <span className="flex items-center gap-1.5 text-xs">
                            {hostedAgentCount !== null
                              ? `${maxAgents - (hostedAgentCount as number)}/${maxAgents} slots`
                              : `${maxAgents} slots`}
                          </span>
                        )}
                      </div>

                      {/* Per-tier pricing chips */}
                      <TierPriceChips host={hostAny} />
                    </div>

                    <Link
                      href={`/dashboard/agents/new?hostId=${host.id}`}
                      className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition-colors shrink-0"
                    >
                      Select
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
