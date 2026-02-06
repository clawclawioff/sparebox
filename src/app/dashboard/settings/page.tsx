"use client";

import { useSession } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc";
import { PasswordInput } from "@/components/ui/password-input";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { User, Shield, Bell, Trash2, Loader2, Check, AlertTriangle } from "lucide-react";

// =============================================================================
// Settings Page
// =============================================================================

export default function SettingsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const utils = trpc.useUtils();

  const [activeTab, setActiveTab] = useState<"profile" | "account" | "notifications">("profile");

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

      {activeTab === "profile" && <ProfileTab utils={utils} />}
      {activeTab === "account" && <AccountTab />}
      {activeTab === "notifications" && <NotificationsTab />}
    </div>
  );
}

// =============================================================================
// Profile Tab
// =============================================================================

function ProfileTab({ utils }: { utils: ReturnType<typeof trpc.useUtils> }) {
  const { data: session } = useSession();
  const meQuery = trpc.users.me.useQuery();
  const router = useRouter();

  const [name, setName] = useState("");
  const [profileSaved, setProfileSaved] = useState(false);

  // Sync name from query data
  useEffect(() => {
    if (meQuery.data?.name) {
      setName(meQuery.data.name);
    }
  }, [meQuery.data?.name]);

  const updateMutation = trpc.users.update.useMutation({
    onSuccess: () => {
      utils.users.me.invalidate();
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
    },
  });

  const userRole = meQuery.data?.role || "user";

  const handleSaveProfile = () => {
    updateMutation.mutate({ name });
  };

  return (
    <div className="space-y-6">
      {/* Profile Card */}
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
                {(meQuery.data?.image || session?.user?.image) ? (
                  <img
                    src={meQuery.data?.image || session?.user?.image || ""}
                    alt=""
                    className="w-16 h-16 rounded-full"
                  />
                ) : (
                  <span className="text-2xl text-muted-foreground">
                    {name?.charAt(0) || session?.user?.name?.charAt(0) || "?"}
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
              value={meQuery.data?.email || session?.user?.email || ""}
              disabled
              className="w-full bg-muted border border-border rounded-lg px-4 py-2.5 text-muted-foreground cursor-not-allowed"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Email cannot be changed directly. Contact support.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 mt-6">
          {profileSaved && (
            <span className="inline-flex items-center gap-1 text-sm text-primary">
              <Check className="w-4 h-4" />
              Saved
            </span>
          )}
          {updateMutation.error && (
            <span className="text-sm text-destructive">
              {updateMutation.error.message}
            </span>
          )}
          <button
            onClick={handleSaveProfile}
            disabled={updateMutation.isPending}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-primary-foreground font-medium rounded-lg transition-colors"
          >
            {updateMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Save Changes
          </button>
        </div>
      </div>

      {/* Role Card */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-lg font-semibold text-foreground mb-1">Role</h2>
        <p className="text-sm text-muted-foreground">
          You are currently a:{" "}
          <span className="text-foreground font-medium capitalize">
            {userRole}
          </span>
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          Your role was set when you created your account. Contact support to change it.
        </p>
      </div>
    </div>
  );
}

// =============================================================================
// Account Tab
// =============================================================================

function AccountTab() {
  const { data: session } = useSession();
  const meQuery = trpc.users.me.useQuery();
  const router = useRouter();

  // Change password state
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // Delete account state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const handleChangePassword = async () => {
    setPasswordError("");
    setPasswordSuccess(false);

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters.");
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          revokeOtherSessions: true,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || "Failed to change password. Check your current password.");
      }

      setPasswordSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => {
        setPasswordSuccess(false);
        setShowPasswordForm(false);
      }, 3000);
    } catch (err: any) {
      setPasswordError(err.message || "Something went wrong.");
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteError("");

    if (!deletePassword) {
      setDeleteError("Please enter your password to confirm.");
      return;
    }

    setDeleteLoading(true);
    try {
      const res = await fetch("/api/auth/delete-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: deletePassword }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || "Failed to delete account. Check your password.");
      }

      // Redirect to landing page
      router.push("/");
    } catch (err: any) {
      setDeleteError(err.message || "Something went wrong.");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Account Security */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-lg font-semibold text-foreground mb-1">
          Account Security
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          Manage your password and connected accounts
        </p>

        {/* Password */}
        <div className="mb-6">
          {!showPasswordForm ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-foreground font-medium">Password</p>
                <p className="text-sm text-muted-foreground">••••••••</p>
              </div>
              <button
                onClick={() => setShowPasswordForm(true)}
                className="text-sm text-primary hover:text-primary/80"
              >
                Change Password
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-foreground font-medium">Change Password</p>
                <button
                  onClick={() => {
                    setShowPasswordForm(false);
                    setPasswordError("");
                    setCurrentPassword("");
                    setNewPassword("");
                    setConfirmPassword("");
                  }}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
              </div>

              <PasswordInput
                label="Current Password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
              />
              <PasswordInput
                label="New Password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                hint="Minimum 8 characters"
              />
              <PasswordInput
                label="Confirm New Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                error={
                  confirmPassword && newPassword !== confirmPassword
                    ? "Passwords do not match"
                    : undefined
                }
              />

              {passwordError && (
                <p className="text-sm text-destructive">{passwordError}</p>
              )}
              {passwordSuccess && (
                <p className="inline-flex items-center gap-1 text-sm text-primary">
                  <Check className="w-4 h-4" />
                  Password changed successfully!
                </p>
              )}

              <button
                onClick={handleChangePassword}
                disabled={passwordLoading || !currentPassword || !newPassword || !confirmPassword}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-primary-foreground font-medium rounded-lg transition-colors"
              >
                {passwordLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Update Password
              </button>
            </div>
          )}
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
              <button
                disabled
                className="text-sm text-muted-foreground cursor-not-allowed"
              >
                Coming Soon
              </button>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-muted rounded flex items-center justify-center text-muted-foreground">
                  GH
                </div>
                <span className="text-foreground">GitHub</span>
              </div>
              <button
                disabled
                className="text-sm text-muted-foreground cursor-not-allowed"
              >
                Coming Soon
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
        <button
          onClick={() => setShowDeleteDialog(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-destructive/10 hover:bg-destructive/20 text-destructive rounded-lg transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          Delete Account
        </button>
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card border border-border rounded-xl p-6 max-w-md mx-4 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">
                Delete Account
              </h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              This action is <strong className="text-foreground">permanent</strong> and cannot be undone.
              All your data, agents, subscriptions, and settings will be deleted.
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Enter your password to confirm:
            </p>

            <PasswordInput
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              placeholder="Enter your password"
            />

            {deleteError && (
              <p className="text-sm text-destructive mt-2">{deleteError}</p>
            )}

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowDeleteDialog(false);
                  setDeletePassword("");
                  setDeleteError("");
                }}
                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteLoading || !deletePassword}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-destructive hover:bg-destructive/90 disabled:bg-destructive/50 text-destructive-foreground rounded-lg transition-colors"
              >
                {deleteLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Delete My Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Notifications Tab
// =============================================================================

function NotificationsTab() {
  const { data: session } = useSession();
  const meQuery = trpc.users.me.useQuery();
  const prefsQuery = trpc.preferences.get.useQuery();
  const utils = trpc.useUtils();

  const [notifSaved, setNotifSaved] = useState(false);

  // Local state for checkboxes — synced from server
  const [prefs, setPrefs] = useState({
    emailSecurityAlerts: true,
    emailAccountUpdates: true,
    emailAgentStatus: true,
    emailBillingAlerts: true,
    emailNewDeployments: true,
    emailMachineOffline: true,
    emailPayouts: true,
    emailProductUpdates: false,
    emailTips: false,
  });

  // Sync from server data
  useEffect(() => {
    if (prefsQuery.data) {
      setPrefs({
        emailSecurityAlerts: prefsQuery.data.emailSecurityAlerts ?? true,
        emailAccountUpdates: prefsQuery.data.emailAccountUpdates ?? true,
        emailAgentStatus: prefsQuery.data.emailAgentStatus ?? true,
        emailBillingAlerts: prefsQuery.data.emailBillingAlerts ?? true,
        emailNewDeployments: prefsQuery.data.emailNewDeployments ?? true,
        emailMachineOffline: prefsQuery.data.emailMachineOffline ?? true,
        emailPayouts: prefsQuery.data.emailPayouts ?? true,
        emailProductUpdates: prefsQuery.data.emailProductUpdates ?? false,
        emailTips: prefsQuery.data.emailTips ?? false,
      });
    }
  }, [prefsQuery.data]);

  const updateMutation = trpc.preferences.update.useMutation({
    onSuccess: () => {
      utils.preferences.get.invalidate();
      setNotifSaved(true);
      setTimeout(() => setNotifSaved(false), 3000);
    },
  });

  const handleToggle = (key: keyof typeof prefs) => {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSaveNotifications = () => {
    updateMutation.mutate(prefs);
  };

  const userRole = meQuery.data?.role || "user";

  if (prefsQuery.isLoading) {
    return (
      <div className="bg-card border border-border rounded-xl p-6 flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <h2 className="text-lg font-semibold text-foreground mb-1">
        Email Notifications
      </h2>
      <p className="text-sm text-muted-foreground mb-6">
        Choose what emails you&apos;d like to receive
      </p>

      <div className="space-y-6">
        {/* Account */}
        <div>
          <h3 className="text-sm font-medium text-foreground mb-3">Account</h3>
          <div className="space-y-3">
            <NotifCheckbox
              checked={prefs.emailSecurityAlerts}
              onChange={() => handleToggle("emailSecurityAlerts")}
              label="Security alerts"
              description="Sign-in from new device, password changes"
            />
            <NotifCheckbox
              checked={prefs.emailAccountUpdates}
              onChange={() => handleToggle("emailAccountUpdates")}
              label="Account updates"
              description="Important changes to your account"
            />
          </div>
        </div>

        {/* Agents (for user role) */}
        {userRole === "user" && (
          <div>
            <h3 className="text-sm font-medium text-foreground mb-3">Agents</h3>
            <div className="space-y-3">
              <NotifCheckbox
                checked={prefs.emailAgentStatus}
                onChange={() => handleToggle("emailAgentStatus")}
                label="Agent status changes"
                description="Started, stopped, failed"
              />
              <NotifCheckbox
                checked={prefs.emailBillingAlerts}
                onChange={() => handleToggle("emailBillingAlerts")}
                label="Billing alerts"
                description="Payment failures, subscription changes"
              />
            </div>
          </div>
        )}

        {/* Hosting (for host role) */}
        {userRole === "host" && (
          <div>
            <h3 className="text-sm font-medium text-foreground mb-3">Hosting</h3>
            <div className="space-y-3">
              <NotifCheckbox
                checked={prefs.emailNewDeployments}
                onChange={() => handleToggle("emailNewDeployments")}
                label="New agent deployments"
                description="When someone deploys to your machine"
              />
              <NotifCheckbox
                checked={prefs.emailMachineOffline}
                onChange={() => handleToggle("emailMachineOffline")}
                label="Machine offline alerts"
                description="When your machine goes offline"
              />
              <NotifCheckbox
                checked={prefs.emailPayouts}
                onChange={() => handleToggle("emailPayouts")}
                label="Payout notifications"
                description="When payouts are processed"
              />
            </div>
          </div>
        )}

        {/* Marketing */}
        <div>
          <h3 className="text-sm font-medium text-foreground mb-3">Marketing</h3>
          <div className="space-y-3">
            <NotifCheckbox
              checked={prefs.emailProductUpdates}
              onChange={() => handleToggle("emailProductUpdates")}
              label="Product updates"
              description="New features and improvements"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 mt-6">
        {notifSaved && (
          <span className="inline-flex items-center gap-1 text-sm text-primary">
            <Check className="w-4 h-4" />
            Saved
          </span>
        )}
        {updateMutation.error && (
          <span className="text-sm text-destructive">
            {updateMutation.error.message}
          </span>
        )}
        <button
          onClick={handleSaveNotifications}
          disabled={updateMutation.isPending}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-primary-foreground font-medium rounded-lg transition-colors"
        >
          {updateMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
          Save Changes
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// Notification Checkbox Component
// =============================================================================

function NotifCheckbox({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  description: string;
}) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="w-4 h-4 rounded border-border bg-background text-primary focus:ring-primary"
      />
      <div>
        <p className="text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </label>
  );
}
