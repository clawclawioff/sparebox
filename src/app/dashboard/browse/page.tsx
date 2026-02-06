"use client";

import { trpc } from "@/lib/trpc";
import Link from "next/link";
import { useState } from "react";
import { Server, MapPin, Cpu, HardDrive, Activity } from "lucide-react";

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
            {hosts.map((host) => (
              <div
                key={host.id}
                className="bg-card border border-border rounded-xl p-6 hover:border-primary/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-foreground text-lg">
                        {host.name}
                      </h3>
                      <span className="text-primary font-semibold">
                        ${((host.pricePerMonth || 0) / 100).toFixed(0)}/mo
                      </span>
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
                    </div>
                  </div>

                  <Link
                    href={`/dashboard/agents/new?hostId=${host.id}`}
                    className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition-colors shrink-0"
                  >
                    Select
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
