"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Copy, Loader2, Key, AlertTriangle, CheckCircle2 } from "lucide-react";
import { TIERS, type TierKey } from "@/lib/constants";

export default function AddHostPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [createdHostId, setCreatedHostId] = useState<string | null>(null);
  const [generatedApiKey, setGeneratedApiKey] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [daemonConnected, setDaemonConnected] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [country, setCountry] = useState("US");
  const [region, setRegion] = useState("");
  const [city, setCity] = useState("");
  const [pricePerMonth, setPricePerMonth] = useState(1000); // cents

  // Per-tier pricing (null = don't offer that tier)
  const [priceLite, setPriceLite] = useState<number | null>(null);
  const [priceStandard, setPriceStandard] = useState<number | null>(null);
  const [pricePro, setPricePro] = useState<number | null>(null);
  const [priceCompute, setPriceCompute] = useState<number | null>(null);

  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [detectNotice, setDetectNotice] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");

  const createHost = trpc.hosts.create.useMutation();
  const generateApiKeyMutation = trpc.hosts.generateApiKey.useMutation();

  // Pre-fill Standard tier price when pricePerMonth changes (only if Standard is not manually set)
  useEffect(() => {
    if (priceStandard === null || priceStandard === 0) {
      setPriceStandard(pricePerMonth);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Poll for daemon connection once we're on step 3
  const { data: hostData } = trpc.hosts.get.useQuery(
    { id: createdHostId! },
    {
      enabled: !!createdHostId && step === 3 && !daemonConnected,
      refetchInterval: 5000,
    }
  );

  useEffect(() => {
    if (hostData?.lastHeartbeat) {
      setDaemonConnected(true);
    }
  }, [hostData?.lastHeartbeat]);

  // ---- Auto-detect location via IP ----
  async function handleDetectLocation() {
    setIsDetectingLocation(true);
    setDetectNotice("");

    try {
      const res = await fetch("https://ipapi.co/json/");
      if (res.ok) {
        const geo = await res.json();
        if (geo.country_code) setCountry(geo.country_code);
        if (geo.region) setRegion(geo.region);
        if (geo.city) setCity(geo.city);
        setDetectNotice("✓ Location detected from your IP address");
      } else {
        setDetectNotice("⚠ Location detection failed — please fill in manually");
      }
    } catch {
      setDetectNotice("⚠ Location detection failed — please fill in manually");
    } finally {
      setIsDetectingLocation(false);
    }
  }

  const canProceedStep1 = name.trim().length >= 1;
  const canProceedStep2 = pricePerMonth >= 500;

  const hostPayout = Math.round(pricePerMonth * 0.6); // 60%

  const handleCreate = async () => {
    setIsCreating(true);
    setError("");

    try {
      const host = await createHost.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
        country: country || undefined,
        region: region.trim() || undefined,
        city: city.trim() || undefined,
        pricePerMonth,
        priceLite: priceLite && priceLite > 0 ? priceLite : null,
        priceStandard: priceStandard && priceStandard > 0 ? priceStandard : null,
        pricePro: pricePro && pricePro > 0 ? pricePro : null,
        priceCompute: priceCompute && priceCompute > 0 ? priceCompute : null,
      });

      setCreatedHostId(host.id);

      // Auto-generate API key
      try {
        const keyResult = await generateApiKeyMutation.mutateAsync({ hostId: host.id });
        setGeneratedApiKey(keyResult.apiKey);
      } catch (keyError: unknown) {
        const message = keyError instanceof Error ? keyError.message : "Failed to generate API key";
        setError(`Machine created, but API key generation failed: ${message}`);
      }

      setStep(3);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to create machine";
      setError(message);
    } finally {
      setIsCreating(false);
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Helper to format cents to dollar display
  const centsToDisplay = (cents: number | null): string => {
    if (cents === null || cents === 0) return "";
    return (cents / 100).toFixed(2);
  };

  // Helper to parse dollar input to cents
  const parseDollarsToCents = (val: string): number | null => {
    if (!val || val.trim() === "") return null;
    const parsed = parseFloat(val);
    if (isNaN(parsed) || parsed <= 0) return null;
    return Math.round(parsed * 100);
  };

  const tierPriceInputs: { key: TierKey; price: number | null; setPrice: (v: number | null) => void }[] = [
    { key: "lite", price: priceLite, setPrice: setPriceLite },
    { key: "standard", price: priceStandard, setPrice: setPriceStandard },
    { key: "pro", price: pricePro, setPrice: setPricePro },
    { key: "compute", price: priceCompute, setPrice: setPriceCompute },
  ];

  return (
    <div className="max-w-2xl mx-auto">
      <Link
        href="/dashboard/hosts"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Machines
      </Link>

      <h1 className="text-2xl font-bold text-foreground mb-2">Add a New Machine</h1>
      <p className="text-muted-foreground mb-8">
        Register your hardware to start hosting AI agents
      </p>

      {/* Progress */}
      <div className="flex items-center gap-2 mb-8">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step > s
                  ? "bg-primary text-primary-foreground"
                  : step === s
                  ? "bg-primary/20 text-primary border border-primary"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {step > s ? <Check className="w-4 h-4" /> : s}
            </div>
            {s < 3 && (
              <div
                className={`w-12 h-0.5 ${step > s ? "bg-primary" : "bg-muted"}`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Name & Location */}
      {step === 1 && (
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-lg font-semibold text-foreground mb-1">
            Step 1: Name &amp; Location
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Give your machine a name and set its location. Hardware specs will be auto-detected when the daemon connects.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Machine Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Home Server"
                className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="My home server running Ubuntu 22.04"
                rows={2}
                className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>

            {/* Location fields */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-foreground">
                  Location
                </label>
                <button
                  onClick={handleDetectLocation}
                  disabled={isDetectingLocation}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-primary/10 hover:bg-primary/20 text-primary font-medium rounded-lg transition-colors border border-primary/20 disabled:opacity-50"
                >
                  {isDetectingLocation ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Detecting...
                    </>
                  ) : (
                    "Auto-detect location"
                  )}
                </button>
              </div>

              {detectNotice && (
                <div className={`rounded-lg p-3 mb-3 text-sm ${
                  detectNotice.startsWith("✓")
                    ? "bg-green-500/10 text-green-700 border border-green-500/20"
                    : "bg-yellow-500/10 text-yellow-700 border border-yellow-500/20"
                }`}>
                  {detectNotice}
                </div>
              )}

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Country</label>
                  <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
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
                  <label className="block text-xs text-muted-foreground mb-1">Region/State</label>
                  <input
                    type="text"
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    placeholder="California"
                    className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">City</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="San Francisco"
                    className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
            </div>

            <div className="bg-muted/50 border border-border rounded-lg p-4">
              <p className="text-sm text-muted-foreground">
                💡 <strong>CPU, RAM, storage, and OS</strong> are automatically detected when your daemon connects. No need to enter them manually.
              </p>
            </div>
          </div>

          <div className="flex justify-end mt-6">
            <button
              onClick={() => setStep(2)}
              disabled={!canProceedStep1}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground text-primary-foreground font-medium rounded-lg transition-colors"
            >
              Continue
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Pricing */}
      {step === 2 && (
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-lg font-semibold text-foreground mb-1">
            Step 2: Pricing
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            Set your monthly prices per tier
          </p>

          {error && (
            <div className="status-error rounded-lg p-4 mb-6">
              <p className="text-sm">{error}</p>
            </div>
          )}

          <div className="space-y-6">
            {/* Default price */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Default Monthly Price *
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <input
                  type="number"
                  value={(pricePerMonth / 100).toFixed(2)}
                  onChange={(e) => {
                    const cents = Math.round(parseFloat(e.target.value) * 100) || 0;
                    setPricePerMonth(cents);
                    // Auto-update Standard if it hasn't been manually changed
                    if (priceStandard === null || priceStandard === pricePerMonth) {
                      setPriceStandard(cents);
                    }
                  }}
                  min={5}
                  max={100}
                  step={0.5}
                  className="w-full bg-background border border-border rounded-lg pl-8 pr-4 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                You&apos;ll receive{" "}
                <span className="text-primary font-medium">
                  ${(hostPayout / 100).toFixed(2)}
                </span>{" "}
                (60%) per subscription
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Suggested: $5 - $15/month depending on tier and resources
              </p>
            </div>

            {/* Per-tier pricing */}
            <div>
              <h3 className="text-sm font-medium text-foreground mb-1">
                Per-Tier Pricing
              </h3>
              <p className="text-xs text-muted-foreground mb-4">
                Set specific prices for each resource tier. Leave blank to not offer that tier.
              </p>

              <div className="space-y-3">
                {tierPriceInputs.map(({ key, price, setPrice }) => {
                  const tier = TIERS[key];
                  return (
                    <div key={key} className="flex items-center gap-3">
                      <div className="flex-1">
                        <label className="block text-sm text-foreground mb-1">
                          <span className="font-medium">{tier.name}</span>
                          <span className="text-muted-foreground ml-1.5 text-xs">
                            ({tier.ramMb >= 1024 ? `${tier.ramMb / 1024}GB` : `${tier.ramMb}MB`} RAM, {tier.cpuCores} CPU, {tier.diskGb}GB disk)
                          </span>
                        </label>
                      </div>
                      <div className="relative w-32">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                          $
                        </span>
                        <input
                          type="number"
                          value={centsToDisplay(price)}
                          onChange={(e) => setPrice(parseDollarsToCents(e.target.value))}
                          placeholder="—"
                          min={0}
                          step={0.5}
                          className="w-full bg-background border border-border rounded-lg pl-7 pr-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                      <span className="text-xs text-muted-foreground w-8">/mo</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex justify-between mt-6">
            <button
              onClick={() => setStep(1)}
              className="inline-flex items-center gap-2 px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <button
              onClick={handleCreate}
              disabled={!canProceedStep2 || isCreating}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground text-primary-foreground font-medium rounded-lg transition-colors"
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

      {/* Step 3: Connect Your Machine */}
      {step === 3 && (
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-lg font-semibold text-foreground mb-1">
            Step 3: Connect Your Machine
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            Install the Sparebox daemon and connect your machine
          </p>

          {error && (
            <div className="status-error rounded-lg p-4 mb-6">
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Connection Status */}
          <div className={`mb-6 rounded-lg p-4 border ${
            daemonConnected
              ? "bg-green-500/5 border-green-500/20"
              : "bg-muted/50 border-border"
          }`}>
            <div className="flex items-center gap-3">
              {daemonConnected ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-green-600">Daemon connected!</p>
                    <p className="text-xs text-muted-foreground">Your machine is sending heartbeats successfully.</p>
                  </div>
                </>
              ) : (
                <>
                  <Loader2 className="w-5 h-5 text-muted-foreground animate-spin shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Waiting for daemon connection...</p>
                    <p className="text-xs text-muted-foreground">Complete the steps below, then this will update automatically.</p>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="space-y-6">
            {/* Step 1: Install */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                1. Run the install command on your machine:
              </label>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-muted px-4 py-3 rounded-lg text-sm text-primary font-mono">
                  curl -fsSL https://www.sparebox.dev/api/install | bash
                </code>
                <button
                  onClick={() =>
                    copyToClipboard(
                      "curl -fsSL https://www.sparebox.dev/api/install | bash",
                      "install"
                    )
                  }
                  className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
                >
                  {copiedField === "install" ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Step 2: Enter credentials */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                2. When prompted, enter these credentials:
              </label>
              <div className="space-y-3">
                {/* API Key */}
                <div>
                  <span className="text-xs text-muted-foreground">API Key</span>
                  {generatedApiKey ? (
                    <div className="flex items-center gap-2 mt-1">
                      <code className="flex-1 bg-muted px-4 py-3 rounded-lg text-sm text-primary font-mono break-all">
                        {generatedApiKey}
                      </code>
                      <button
                        onClick={() => copyToClipboard(generatedApiKey, "apikey")}
                        className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors shrink-0"
                      >
                        {copiedField === "apikey" ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm text-destructive mt-1">
                      Failed to generate. Visit the machine details page to generate one.
                    </p>
                  )}
                </div>
                {/* Host ID */}
                <div>
                  <span className="text-xs text-muted-foreground">Host ID</span>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="flex-1 bg-muted px-4 py-3 rounded-lg text-sm text-primary font-mono">
                      {createdHostId}
                    </code>
                    <button
                      onClick={() => copyToClipboard(createdHostId || "", "hostid")}
                      className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors shrink-0"
                    >
                      {copiedField === "hostid" ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Warning */}
            {generatedApiKey && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-foreground">
                    <strong>Save your API key now</strong> — it won&apos;t be shown again. If you lose it, you can regenerate from the machine details page.
                  </p>
                </div>
              </div>
            )}

            {/* Step 3: Verify */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                3. The daemon will start sending heartbeats
              </label>
              <div className="bg-muted/50 rounded-lg p-4">
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Reports health metrics every 60 seconds</li>
                  <li>Auto-updates to the latest version</li>
                  <li>Uses secure authenticated connections</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex justify-between mt-6">
            <button
              onClick={() => router.push("/dashboard/hosts")}
              className="inline-flex items-center gap-2 px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              Skip for Now
            </button>
            <Link
              href={`/dashboard/hosts/${createdHostId}`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition-colors"
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
