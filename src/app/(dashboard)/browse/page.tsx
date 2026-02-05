"use client";

import { trpc } from "@/lib/trpc";
import Link from "next/link";
import { Server, MapPin, Cpu, HardDrive, Activity } from "lucide-react";

export default function BrowseHostsPage() {
  const { data: hosts, isLoading } = trpc.hosts.listAvailable.useQuery();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Browse Hosts</h1>
        <p className="text-zinc-400 mt-1">
          Find the perfect host for your AI agent
        </p>
      </div>

      {/* Filters - TODO: implement */}
      <div className="flex gap-4 mb-6">
        <select className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white">
          <option value="">Any Region</option>
          <option value="us">United States</option>
          <option value="eu">Europe</option>
          <option value="asia">Asia</option>
        </select>
        <select className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white">
          <option value="">Any RAM</option>
          <option value="8">8GB+</option>
          <option value="16">16GB+</option>
          <option value="32">32GB+</option>
        </select>
        <select className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white">
          <option value="">Any Price</option>
          <option value="10">Under $10/mo</option>
          <option value="20">Under $20/mo</option>
          <option value="50">Under $50/mo</option>
        </select>
      </div>

      {isLoading ? (
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 h-32 animate-pulse"
            />
          ))}
        </div>
      ) : !hosts || hosts.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-12 text-center">
          <div className="w-12 h-12 bg-zinc-800 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Server className="w-6 h-6 text-zinc-500" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">
            No hosts available yet
          </h3>
          <p className="text-sm text-zinc-400 max-w-sm mx-auto">
            Check back soon — hosts are being onboarded.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-zinc-400">{hosts.length} hosts available</p>
          <div className="grid gap-4">
            {hosts.map((host) => (
              <div
                key={host.id}
                className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 hover:border-zinc-700 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-white text-lg">
                        {host.name}
                      </h3>
                      <span className="text-emerald-400 font-semibold">
                        ${((host.pricePerMonth || 0) / 100).toFixed(0)}/mo
                      </span>
                    </div>
                    
                    {host.description && (
                      <p className="text-sm text-zinc-400 mt-1">
                        {host.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-zinc-400">
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
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-black font-medium rounded-lg transition-colors shrink-0"
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
