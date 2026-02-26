"use client";

import { trpc } from "@/lib/trpc";
import { useState } from "react";
import {
  Loader2,
  Save,
  Plus,
  Trash2,
  Key,
  Eye,
  EyeOff,
  Settings,
} from "lucide-react";

export function AgentSettings({ agentId }: { agentId: string }) {
  const utils = trpc.useUtils();

  // Settings
  const { data: settingsData, isLoading: settingsLoading } =
    trpc.agentSettings.get.useQuery({ agentId });

  const updateSettings = trpc.agentSettings.update.useMutation({
    onSuccess: () => utils.agentSettings.get.invalidate({ agentId }),
  });

  // Secrets
  const { data: secretsData, isLoading: secretsLoading } =
    trpc.secrets.list.useQuery({ agentId });

  const setSecret = trpc.secrets.set.useMutation({
    onSuccess: () => {
      utils.secrets.list.invalidate({ agentId });
      setNewKey("");
      setNewValue("");
      setNewLabel("");
      setShowAddCustom(false);
    },
  });

  const deleteSecret = trpc.secrets.delete.useMutation({
    onSuccess: () => utils.secrets.list.invalidate({ agentId }),
  });

  // Local state
  const [name, setName] = useState<string | null>(null);
  const [timezone, setTimezone] = useState<string | null>(null);
  const [thinkingLevel, setThinkingLevel] = useState<string | null>(null);
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  // Known key being configured
  const [configuringKnownKey, setConfiguringKnownKey] = useState<string | null>(null);
  const [knownKeyValue, setKnownKeyValue] = useState("");

  if (settingsLoading || secretsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const currentName = name ?? settingsData?.name ?? "";
  const currentSettings = settingsData?.settings ?? {};
  const currentTimezone = timezone ?? (currentSettings.timezone as string) ?? "";
  const currentThinking = thinkingLevel ?? (currentSettings.thinkingLevel as string) ?? "low";

  const handleSaveSettings = () => {
    updateSettings.mutate({
      agentId,
      ...(name !== null ? { name } : {}),
      settings: {
        ...(timezone !== null ? { timezone } : {}),
        ...(thinkingLevel !== null
          ? { thinkingLevel: thinkingLevel as "off" | "low" | "medium" | "high" }
          : {}),
      },
    });
  };

  const hasChanges = name !== null || timezone !== null || thinkingLevel !== null;

  return (
    <div className="space-y-6">
      {/* General Settings */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-foreground">General Settings</h3>
        </div>

        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="text-sm text-muted-foreground block mb-1">Agent Name</label>
            <input
              type="text"
              value={currentName}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Tier (read-only) */}
          <div>
            <label className="text-sm text-muted-foreground block mb-1">Tier</label>
            <p className="text-sm text-foreground capitalize">{settingsData?.tier || "standard"}</p>
          </div>

          {/* Timezone */}
          <div>
            <label className="text-sm text-muted-foreground block mb-1">Timezone</label>
            <input
              type="text"
              value={currentTimezone}
              onChange={(e) => setTimezone(e.target.value)}
              placeholder="e.g. America/New_York"
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Thinking Level */}
          <div>
            <label className="text-sm text-muted-foreground block mb-2">Thinking Level</label>
            <div className="flex gap-2">
              {(["off", "low", "medium", "high"] as const).map((level) => (
                <button
                  key={level}
                  onClick={() => setThinkingLevel(level)}
                  className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                    currentThinking === level
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-border hover:text-foreground"
                  }`}
                >
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {hasChanges && (
          <div className="mt-4 flex justify-end">
            <button
              onClick={handleSaveSettings}
              disabled={updateSettings.isPending}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition-colors disabled:opacity-50 text-sm"
            >
              {updateSettings.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save Changes
            </button>
          </div>
        )}

        {updateSettings.isError && (
          <p className="mt-2 text-sm text-destructive">
            {updateSettings.error.message}
          </p>
        )}
      </div>

      {/* API Keys */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Key className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-foreground">API Keys</h3>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          Configure API keys for your agent&apos;s tools. Keys are encrypted and never shown in plaintext.
        </p>

        {/* Known keys */}
        <div className="space-y-3 mb-6">
          {secretsData?.available.map((k) => {
            const configured = secretsData.configured.find((c) => c.key === k.key);
            const isConfiguring = configuringKnownKey === k.key;

            return (
              <div key={k.key} className="flex items-center justify-between bg-muted/50 rounded-lg px-4 py-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{k.label}</span>
                    <span className="text-xs text-muted-foreground">{k.description}</span>
                  </div>
                  {configured && (
                    <p className="text-xs font-mono text-muted-foreground mt-0.5">
                      {configured.maskedValue}
                    </p>
                  )}
                </div>

                {isConfiguring ? (
                  <div className="flex items-center gap-2 ml-4">
                    <input
                      type="password"
                      value={knownKeyValue}
                      onChange={(e) => setKnownKeyValue(e.target.value)}
                      placeholder="Paste API key"
                      className="w-64 bg-background border border-border rounded-lg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <button
                      onClick={() => {
                        if (knownKeyValue.trim()) {
                          setSecret.mutate({
                            agentId,
                            key: k.key,
                            value: knownKeyValue.trim(),
                            label: k.label,
                            category: k.category,
                          });
                          setConfiguringKnownKey(null);
                          setKnownKeyValue("");
                        }
                      }}
                      disabled={setSecret.isPending}
                      className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 disabled:opacity-50"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setConfiguringKnownKey(null);
                        setKnownKeyValue("");
                      }}
                      className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => {
                        setConfiguringKnownKey(k.key);
                        setKnownKeyValue("");
                      }}
                      className="px-3 py-1.5 text-sm bg-muted hover:bg-accent text-foreground rounded-lg transition-colors"
                    >
                      {configured ? "Update" : "Configure"}
                    </button>
                    {configured && (
                      <button
                        onClick={() => {
                          if (confirm(`Remove ${k.label} API key?`)) {
                            deleteSecret.mutate({ agentId, key: k.key });
                          }
                        }}
                        disabled={deleteSecret.isPending}
                        className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Custom configured keys */}
        {secretsData?.configured
          .filter((c) => !secretsData.available.some((a) => a.key === c.key))
          .map((c) => (
            <div key={c.key} className="flex items-center justify-between bg-muted/50 rounded-lg px-4 py-3 mb-3">
              <div>
                <span className="text-sm font-medium text-foreground">{c.label || c.key}</span>
                <p className="text-xs font-mono text-muted-foreground mt-0.5">{c.maskedValue}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setEditingKey(c.key);
                    setEditValue("");
                  }}
                  className="px-3 py-1.5 text-sm bg-muted hover:bg-accent text-foreground rounded-lg"
                >
                  Update
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Remove ${c.label || c.key}?`)) {
                      deleteSecret.mutate({ agentId, key: c.key });
                    }
                  }}
                  className="p-1.5 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}

        {/* Editing a custom key */}
        {editingKey && (
          <div className="bg-muted/30 border border-border rounded-lg p-4 mb-4">
            <p className="text-sm font-medium text-foreground mb-2">Update: {editingKey}</p>
            <div className="flex items-center gap-2">
              <input
                type="password"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                placeholder="New value"
                className="flex-1 bg-background border border-border rounded-lg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                onClick={() => {
                  if (editValue.trim()) {
                    setSecret.mutate({ agentId, key: editingKey, value: editValue.trim() });
                    setEditingKey(null);
                    setEditValue("");
                  }
                }}
                disabled={setSecret.isPending}
                className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm"
              >
                Save
              </button>
              <button
                onClick={() => { setEditingKey(null); setEditValue(""); }}
                className="px-3 py-1.5 text-sm text-muted-foreground"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Add custom key */}
        {showAddCustom ? (
          <div className="bg-muted/30 border border-border rounded-lg p-4">
            <p className="text-sm font-medium text-foreground mb-3">Add Custom Key</p>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ""))}
                  placeholder="KEY_NAME (e.g. MY_API_KEY)"
                  className="bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring font-mono"
                />
                <input
                  type="text"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="Label (optional)"
                  className="bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <input
                type="password"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder="Value (API key, token, etc.)"
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => { setShowAddCustom(false); setNewKey(""); setNewValue(""); setNewLabel(""); }}
                  className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (newKey && newValue.trim()) {
                      setSecret.mutate({
                        agentId,
                        key: newKey,
                        value: newValue.trim(),
                        label: newLabel || undefined,
                        category: "custom",
                      });
                    }
                  }}
                  disabled={!newKey || !newValue.trim() || setSecret.isPending}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 disabled:opacity-50"
                >
                  {setSecret.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  Add Key
                </button>
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAddCustom(true)}
            className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Custom Key
          </button>
        )}

        {setSecret.isError && (
          <p className="mt-2 text-sm text-destructive">{setSecret.error.message}</p>
        )}
      </div>
    </div>
  );
}
