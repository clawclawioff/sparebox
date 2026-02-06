"use client";

import { useSession } from "@/lib/auth-client";
import { useState } from "react";
import { User, Shield, Bell, Trash2, Loader2 } from "lucide-react";

export default function SettingsPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<"profile" | "account" | "notifications">("profile");
  const [isSaving, setIsSaving] = useState(false);

  const [name, setName] = useState(session?.user?.name || "");

  const userRole = (session?.user as any)?.role || "user";

  const handleSaveProfile = async () => {
    setIsSaving(true);
    // TODO: Call tRPC mutation
    await new Promise((r) => setTimeout(r, 1000));
    setIsSaving(false);
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account settings</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-card border border-border rounded-lg p-1 w-fit">
        {(
          [
            { id: "profile", label: "Profile", icon: User },
            { id: "account", label: "Account", icon: Shield },
            { id: "notifications", label: "Notifications", icon: Bell },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === tab.id
                ? "bg-accent text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {activeTab === "profile" && (
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-lg font-semibold text-foreground mb-1">Profile</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Manage your personal information
            </p>

            <div className="space-y-4">
              {/* Avatar */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Profile Picture
                </label>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                    {session?.user?.image ? (
                      <img
                        src={session.user.image}
                        alt=""
                        className="w-16 h-16 rounded-full"
                      />
                    ) : (
                      <span className="text-2xl text-muted-foreground">
                        {session?.user?.name?.charAt(0) || "?"}
                      </span>
                    )}
                  </div>
                  <div>
                    <button className="text-sm text-primary hover:text-primary/80">
                      Upload new
                    </button>
                    <span className="text-muted-foreground mx-2">•</span>
                    <button className="text-sm text-muted-foreground hover:text-foreground">
                      Remove
                    </button>
                  </div>
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              {/* Email (readonly) */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={session?.user?.email || ""}
                  disabled
                  className="w-full bg-muted border border-border rounded-lg px-4 py-2.5 text-muted-foreground cursor-not-allowed"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Email cannot be changed directly. Contact support.
                </p>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={handleSaveProfile}
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-primary-foreground font-medium rounded-lg transition-colors"
              >
                {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                Save Changes
              </button>
            </div>
          </div>

          {/* Role */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-lg font-semibold text-foreground mb-1">Role</h2>
            <p className="text-sm text-muted-foreground mb-4">
              You are currently a:{" "}
              <span className="text-foreground font-medium capitalize">
                {userRole}
              </span>
            </p>

            {userRole === "user" && (
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-foreground font-medium mb-2">
                  Want to earn money by hosting AI agents?
                </p>
                <ul className="text-sm text-muted-foreground space-y-1 mb-4">
                  <li>• Register your spare hardware</li>
                  <li>• Earn 60% of each subscription</li>
                  <li>• Get paid monthly via Stripe</li>
                </ul>
                <button className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition-colors">
                  Become a Host
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Account Tab */}
      {activeTab === "account" && (
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-lg font-semibold text-foreground mb-1">
              Account Security
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              Manage your password and connected accounts
            </p>

            {/* Password */}
            <div className="mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-foreground font-medium">Password</p>
                  <p className="text-sm text-muted-foreground">••••••••</p>
                </div>
                <button className="text-sm text-primary hover:text-primary/80">
                  Change Password
                </button>
              </div>
            </div>

            {/* Connected Accounts */}
            <div>
              <p className="text-foreground font-medium mb-4">Connected Accounts</p>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-muted rounded flex items-center justify-center text-muted-foreground">
                      G
                    </div>
                    <span className="text-foreground">Google</span>
                  </div>
                  <button className="text-sm text-muted-foreground hover:text-foreground">
                    Connect
                  </button>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-muted rounded flex items-center justify-center text-muted-foreground">
                      GH
                    </div>
                    <span className="text-foreground">GitHub</span>
                  </div>
                  <button className="text-sm text-muted-foreground hover:text-foreground">
                    Connect
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-card border border-destructive/20 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-destructive mb-1">
              Danger Zone
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Permanently delete your account and all associated data.
            </p>
            <button className="inline-flex items-center gap-2 px-4 py-2 bg-destructive/10 hover:bg-destructive/20 text-destructive rounded-lg transition-colors">
              <Trash2 className="w-4 h-4" />
              Delete Account
            </button>
          </div>
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === "notifications" && (
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-lg font-semibold text-foreground mb-1">
            Email Notifications
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            Choose what emails you'd like to receive
          </p>

          <div className="space-y-6">
            {/* Account */}
            <div>
              <h3 className="text-sm font-medium text-foreground mb-3">Account</h3>
              <div className="space-y-3">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="w-4 h-4 rounded border-border bg-background text-primary focus:ring-primary"
                  />
                  <div>
                    <p className="text-foreground">Security alerts</p>
                    <p className="text-xs text-muted-foreground">
                      Sign-in from new device, password changes
                    </p>
                  </div>
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="w-4 h-4 rounded border-border bg-background text-primary focus:ring-primary"
                  />
                  <div>
                    <p className="text-foreground">Account updates</p>
                    <p className="text-xs text-muted-foreground">
                      Important changes to your account
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Agents */}
            {userRole === "user" && (
              <div>
                <h3 className="text-sm font-medium text-foreground mb-3">
                  Agents
                </h3>
                <div className="space-y-3">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      defaultChecked
                      className="w-4 h-4 rounded border-border bg-background text-primary focus:ring-primary"
                    />
                    <div>
                      <p className="text-foreground">Agent status changes</p>
                      <p className="text-xs text-muted-foreground">
                        Started, stopped, failed
                      </p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      defaultChecked
                      className="w-4 h-4 rounded border-border bg-background text-primary focus:ring-primary"
                    />
                    <div>
                      <p className="text-foreground">Billing alerts</p>
                      <p className="text-xs text-muted-foreground">
                        Payment failures, subscription changes
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* Hosting */}
            {userRole === "host" && (
              <div>
                <h3 className="text-sm font-medium text-foreground mb-3">
                  Hosting
                </h3>
                <div className="space-y-3">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      defaultChecked
                      className="w-4 h-4 rounded border-border bg-background text-primary focus:ring-primary"
                    />
                    <div>
                      <p className="text-foreground">New agent deployments</p>
                      <p className="text-xs text-muted-foreground">
                        When someone deploys to your machine
                      </p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      defaultChecked
                      className="w-4 h-4 rounded border-border bg-background text-primary focus:ring-primary"
                    />
                    <div>
                      <p className="text-foreground">Machine offline alerts</p>
                      <p className="text-xs text-muted-foreground">
                        When your machine goes offline
                      </p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      defaultChecked
                      className="w-4 h-4 rounded border-border bg-background text-primary focus:ring-primary"
                    />
                    <div>
                      <p className="text-foreground">Payout notifications</p>
                      <p className="text-xs text-muted-foreground">
                        When payouts are processed
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* Marketing */}
            <div>
              <h3 className="text-sm font-medium text-foreground mb-3">
                Marketing
              </h3>
              <div className="space-y-3">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-border bg-background text-primary focus:ring-primary"
                  />
                  <div>
                    <p className="text-foreground">Product updates</p>
                    <p className="text-xs text-muted-foreground">
                      New features and improvements
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-end mt-6">
            <button className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition-colors">
              Save Changes
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
