"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Copy, Loader2 } from "lucide-react";

export default function AddHostPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [createdHostId, setCreatedHostId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [cpuCores, setCpuCores] = useState(4);
  const [ramGb, setRamGb] = useState(16);
  const [storageGb, setStorageGb] = useState(100);
  const [osInfo, setOsInfo] = useState("");
  const [country, setCountry] = useState("US");
  const [region, setRegion] = useState("");
  const [city, setCity] = useState("");
  const [pricePerMonth, setPricePerMonth] = useState(1000); // cents

  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");

  const createHost = trpc.hosts.create.useMutation();

  const canProceedStep1 = name.trim().length >= 1 && cpuCores > 0 && ramGb >= 4;
  const canProceedStep2 = pricePerMonth >= 500;

  const hostPayout = Math.round(pricePerMonth * 0.6); // 60%

  const handleCreate = async () => {
    setIsCreating(true);
    setError("");

    try {
      const host = await createHost.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
        cpuCores,
        ramGb,
        storageGb,
        osInfo: osInfo.trim() || undefined,
        country: country || undefined,
        region: region.trim() || undefined,
        city: city.trim() || undefined,
        pricePerMonth,
      });

      setCreatedHostId(host.id);
      setStep(3);
    } catch (e: any) {
      setError(e.message || "Failed to create machine");
    } finally {
      setIsCreating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const registrationToken = createdHostId
    ? `sbx_reg_${createdHostId.replace(/-/g, "").slice(0, 24)}`
    : "";

  return (
    <div className="max-w-2xl mx-auto">
      <Link
        href="/dashboard/hosts"
        className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Machines
      </Link>

      <h1 className="text-2xl font-bold text-white mb-2">Add a New Machine</h1>
      <p className="text-zinc-400 mb-8">
        Register your hardware to start hosting AI agents
      </p>

      {/* Progress */}
      <div className="flex items-center gap-2 mb-8">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step > s
                  ? "bg-emerald-500 text-black"
                  : step === s
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500"
                  : "bg-zinc-800 text-zinc-500"
              }`}
            >
              {step > s ? <Check className="w-4 h-4" /> : s}
            </div>
            {s < 3 && (
              <div
                className={`w-12 h-0.5 ${
                  step > s ? "bg-emerald-500" : "bg-zinc-800"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Machine Details */}
      {step === 1 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-1">
            Step 1: Machine Details
          </h2>
          <p className="text-sm text-zinc-400 mb-6">
            Tell us about your hardware
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Machine Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Home Server"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="My home server running Ubuntu 22.04"
                rows={2}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 resize-none"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  CPU Cores *
                </label>
                <select
                  value={cpuCores}
                  onChange={(e) => setCpuCores(Number(e.target.value))}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                >
                  {[1, 2, 4, 6, 8, 12, 16, 24, 32, 64].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  RAM (GB) *
                </label>
                <select
                  value={ramGb}
                  onChange={(e) => setRamGb(Number(e.target.value))}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                >
                  {[4, 8, 16, 32, 64, 128, 256].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Storage (GB)
                </label>
                <select
                  value={storageGb}
                  onChange={(e) => setStorageGb(Number(e.target.value))}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                >
                  {[50, 100, 250, 500, 1000, 2000].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Operating System
              </label>
              <input
                type="text"
                value={osInfo}
                onChange={(e) => setOsInfo(e.target.value)}
                placeholder="Ubuntu 22.04 LTS"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="flex justify-end mt-6">
            <button
              onClick={() => setStep(2)}
              disabled={!canProceedStep1}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-zinc-700 disabled:text-zinc-400 text-black font-medium rounded-lg transition-colors"
            >
              Continue
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Location & Pricing */}
      {step === 2 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-1">
            Step 2: Location & Pricing
          </h2>
          <p className="text-sm text-zinc-400 mb-6">
            Set your location and monthly price
          </p>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Country
                </label>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="US">United States</option>
                  <option value="CA">Canada</option>
                  <option value="GB">United Kingdom</option>
                  <option value="DE">Germany</option>
                  <option value="FR">France</option>
                  <option value="AU">Australia</option>
                  <option value="JP">Japan</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Region/State
                </label>
                <input
                  type="text"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  placeholder="California"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  City
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="San Francisco"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Monthly Price *
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400">
                  $
                </span>
                <input
                  type="number"
                  value={(pricePerMonth / 100).toFixed(2)}
                  onChange={(e) =>
                    setPricePerMonth(Math.round(parseFloat(e.target.value) * 100) || 0)
                  }
                  min={5}
                  max={100}
                  step={0.5}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-8 pr-4 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <p className="text-sm text-zinc-400 mt-2">
                You'll receive{" "}
                <span className="text-emerald-400 font-medium">
                  ${(hostPayout / 100).toFixed(2)}
                </span>{" "}
                (60%) per subscription
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                Suggested: $10 - $15/month for {cpuCores} cores / {ramGb}GB RAM
              </p>
            </div>
          </div>

          <div className="flex justify-between mt-6">
            <button
              onClick={() => setStep(1)}
              className="inline-flex items-center gap-2 px-4 py-2 text-zinc-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <button
              onClick={handleCreate}
              disabled={!canProceedStep2 || isCreating}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-zinc-700 disabled:text-zinc-400 text-black font-medium rounded-lg transition-colors"
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Install Agent */}
      {step === 3 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-1">
            Step 3: Install Host Agent
          </h2>
          <p className="text-sm text-zinc-400 mb-6">
            Install our lightweight agent software on your machine
          </p>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Run this command on your machine:
              </label>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-zinc-800 px-4 py-3 rounded-lg text-sm text-emerald-400 font-mono">
                  curl -fsSL https://sparebox.dev/install | sh
                </code>
                <button
                  onClick={() =>
                    copyToClipboard(
                      "curl -fsSL https://sparebox.dev/install | sh"
                    )
                  }
                  className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                After installation, enter this registration token:
              </label>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-zinc-800 px-4 py-3 rounded-lg text-sm text-emerald-400 font-mono">
                  {registrationToken}
                </code>
                <button
                  onClick={() => copyToClipboard(registrationToken)}
                  className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="bg-zinc-800/50 rounded-lg p-4">
              <p className="text-sm text-zinc-300 mb-2">
                ℹ️ The agent will:
              </p>
              <ul className="text-sm text-zinc-400 space-y-1 list-disc list-inside">
                <li>Run in a Docker container</li>
                <li>Use Tailscale for secure networking</li>
                <li>Auto-update to the latest version</li>
                <li>Report health metrics every 60 seconds</li>
              </ul>
            </div>
          </div>

          <div className="flex justify-between mt-6">
            <button
              onClick={() => router.push("/dashboard/hosts")}
              className="inline-flex items-center gap-2 px-4 py-2 text-zinc-400 hover:text-white transition-colors"
            >
              Skip for Now
            </button>
            <Link
              href={`/dashboard/hosts/${createdHostId}`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-black font-medium rounded-lg transition-colors"
            >
              View Machine
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
