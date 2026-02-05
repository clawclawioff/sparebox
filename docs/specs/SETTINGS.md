# Settings Specification

**Parent:** [MVP.md](./MVP.md)  
**Status:** Draft

---

## 1. Overview

Settings allows users to:
1. Update profile information
2. Manage account security
3. Upgrade/downgrade role
4. Manage notification preferences
5. Delete account

---

## 2. Pages

### 2.1 Settings Overview

**Route:** `/dashboard/settings`  
**Access:** Authenticated users

```
┌─────────────────────────────────────────────────────────────┐
│ Settings                                                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ┌───────────────────────────────────────────────────────┐  │
│ │ Profile             Account             Notifications │  │
│ │ [Active]                                              │  │
│ └───────────────────────────────────────────────────────┘  │
│                                                             │
│ ┌───────────────────────────────────────────────────────┐  │
│ │ Profile                                               │  │
│ │ Manage your personal information                      │  │
│ ├───────────────────────────────────────────────────────┤  │
│ │                                                       │  │
│ │ Profile Picture                                       │  │
│ │ ┌─────┐                                               │  │
│ │ │ [A] │  [Upload new]  [Remove]                       │  │
│ │ └─────┘                                               │  │
│ │                                                       │  │
│ │ Name                                                  │  │
│ │ ┌─────────────────────────────────────────────────┐  │  │
│ │ │ John Doe                                        │  │  │
│ │ └─────────────────────────────────────────────────┘  │  │
│ │                                                       │  │
│ │ Email                                                 │  │
│ │ ┌─────────────────────────────────────────────────┐  │  │
│ │ │ john@example.com                            🔒  │  │  │
│ │ └─────────────────────────────────────────────────┘  │  │
│ │ Email cannot be changed directly. Contact support.   │  │
│ │                                                       │  │
│ │                                     [Save Changes]    │  │
│ └───────────────────────────────────────────────────────┘  │
│                                                             │
│ ┌───────────────────────────────────────────────────────┐  │
│ │ Role                                                  │  │
│ │ You are currently a: User                             │  │
│ ├───────────────────────────────────────────────────────┤  │
│ │                                                       │  │
│ │ Want to earn money by hosting AI agents?              │  │
│ │                                                       │  │
│ │ As a host, you can:                                   │  │
│ │ • Register your spare hardware                        │  │
│ │ • Earn 60% of each subscription                       │  │
│ │ • Get paid monthly via Stripe                         │  │
│ │                                                       │  │
│ │                             [Become a Host]           │  │
│ └───────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Account Tab

```
┌───────────────────────────────────────────────────────┐
│ Account Security                                      │
│ Manage your password and connected accounts           │
├───────────────────────────────────────────────────────┤
│                                                       │
│ Password                                              │
│ ••••••••                     [Change Password]        │
│ Last changed: January 15, 2026                        │
│                                                       │
│ Connected Accounts                                    │
│ ┌─────────────────────────────────────────────────┐  │
│ │ [GitHub Icon] GitHub         [Disconnect]       │  │
│ │ Connected as @johndoe                           │  │
│ └─────────────────────────────────────────────────┘  │
│                                                       │
│ ┌─────────────────────────────────────────────────┐  │
│ │ [Google Icon] Google         [Connect]          │  │
│ │ Not connected                                   │  │
│ └─────────────────────────────────────────────────┘  │
│                                                       │
│ Sessions                                              │
│ ┌─────────────────────────────────────────────────┐  │
│ │ Current session                                 │  │
│ │ Chrome on macOS • San Francisco                 │  │
│ │ Last active: now                                │  │
│ └─────────────────────────────────────────────────┘  │
│                                                       │
│ ┌─────────────────────────────────────────────────┐  │
│ │ Safari on iPhone • New York                     │  │
│ │ Last active: 2 days ago        [Revoke]         │  │
│ └─────────────────────────────────────────────────┘  │
│                                                       │
│                       [Sign Out All Other Sessions]   │
│                                                       │
└───────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────┐
│ Danger Zone                                           │
├───────────────────────────────────────────────────────┤
│                                                       │
│ Delete Account                                        │
│ Permanently delete your account and all associated    │
│ data. This action cannot be undone.                   │
│                                                       │
│ ⚠️ Active subscriptions will be canceled             │
│ ⚠️ Hosted agents will be stopped                     │
│ ⚠️ Pending payouts will be forfeited                 │
│                                                       │
│                            [Delete Account]           │
│                                                       │
└───────────────────────────────────────────────────────┘
```

### 2.3 Notifications Tab

```
┌───────────────────────────────────────────────────────┐
│ Email Notifications                                   │
│ Choose what emails you'd like to receive              │
├───────────────────────────────────────────────────────┤
│                                                       │
│ Account                                               │
│ ┌─────────────────────────────────────────────────┐  │
│ │ [✓] Security alerts                             │  │
│ │     Sign-in from new device, password changes   │  │
│ │                                                 │  │
│ │ [✓] Account updates                             │  │
│ │     Important changes to your account           │  │
│ └─────────────────────────────────────────────────┘  │
│                                                       │
│ Agents (Users only)                                   │
│ ┌─────────────────────────────────────────────────┐  │
│ │ [✓] Agent status changes                        │  │
│ │     Started, stopped, failed                    │  │
│ │                                                 │  │
│ │ [✓] Billing alerts                              │  │
│ │     Payment failures, subscription changes      │  │
│ └─────────────────────────────────────────────────┘  │
│                                                       │
│ Hosting (Hosts only)                                  │
│ ┌─────────────────────────────────────────────────┐  │
│ │ [✓] New agent deployments                       │  │
│ │     When someone deploys to your machine        │  │
│ │                                                 │  │
│ │ [✓] Machine offline alerts                      │  │
│ │     When your machine goes offline              │  │
│ │                                                 │  │
│ │ [✓] Payout notifications                        │  │
│ │     When payouts are processed                  │  │
│ └─────────────────────────────────────────────────┘  │
│                                                       │
│ Marketing                                             │
│ ┌─────────────────────────────────────────────────┐  │
│ │ [ ] Product updates                             │  │
│ │     New features and improvements               │  │
│ │                                                 │  │
│ │ [ ] Tips and tutorials                          │  │
│ │     Help getting the most out of Sparebox       │  │
│ └─────────────────────────────────────────────────┘  │
│                                                       │
│                                     [Save Changes]    │
│                                                       │
└───────────────────────────────────────────────────────┘
```

### 2.4 Change Password Modal

```
┌─────────────────────────────────────────────────────────────┐
│ Change Password                                        [X]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Current Password                                            │
│ ┌─────────────────────────────────────────────────────┐    │
│ │ ••••••••                              [Show/Hide]   │    │
│ └─────────────────────────────────────────────────────┘    │
│                                                             │
│ New Password                                                │
│ ┌─────────────────────────────────────────────────────┐    │
│ │ ••••••••                              [Show/Hide]   │    │
│ └─────────────────────────────────────────────────────┘    │
│ At least 8 characters                                       │
│                                                             │
│ Confirm New Password                                        │
│ ┌─────────────────────────────────────────────────────┐    │
│ │ ••••••••                              [Show/Hide]   │    │
│ └─────────────────────────────────────────────────────┘    │
│                                                             │
│                              [Cancel]  [Update Password]    │
└─────────────────────────────────────────────────────────────┘
```

### 2.5 Delete Account Modal

```
┌─────────────────────────────────────────────────────────────┐
│ Delete Account                                         [X]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ⚠️ This action is permanent and cannot be undone.           │
│                                                             │
│ What will happen:                                           │
│ • All your agents will be stopped and deleted               │
│ • All your machines will be unregistered                    │
│ • All your subscriptions will be canceled                   │
│ • Pending payouts will be forfeited                         │
│ • Your account data will be permanently deleted             │
│                                                             │
│ To confirm, type your email address:                        │
│ john@example.com                                            │
│                                                             │
│ ┌─────────────────────────────────────────────────────┐    │
│ │                                                     │    │
│ └─────────────────────────────────────────────────────┘    │
│                                                             │
│                     [Cancel]  [Delete My Account]           │
│                             (disabled until email matches)  │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Data Model

### 3.1 User Preferences

```typescript
// Add to user table or separate preferences table
interface UserPreferences {
  userId: string;
  
  // Notifications
  emailSecurityAlerts: boolean;
  emailAccountUpdates: boolean;
  emailAgentStatus: boolean;
  emailBillingAlerts: boolean;
  emailNewDeployments: boolean;
  emailMachineOffline: boolean;
  emailPayouts: boolean;
  emailProductUpdates: boolean;
  emailTips: boolean;
  
  createdAt: Date;
  updatedAt: Date;
}
```

---

## 4. tRPC Procedures

```typescript
settings: router({
  // Get current user profile
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.query.user.findFirst({
      where: eq(user.id, ctx.user.id),
      columns: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        createdAt: true,
      },
    });
  }),

  // Update profile
  updateProfile: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(100).optional(),
      image: z.string().url().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.update(user)
        .set({
          name: input.name,
          image: input.image,
          updatedAt: new Date(),
        })
        .where(eq(user.id, ctx.user.id));
      
      return { success: true };
    }),

  // Upload profile picture (returns presigned URL or handles upload)
  getUploadUrl: protectedProcedure.mutation(async ({ ctx }) => {
    // Generate presigned URL for S3/Cloudflare R2
    // MVP: Use external service like Uploadthing or skip
  }),

  // Change password
  changePassword: protectedProcedure
    .input(z.object({
      currentPassword: z.string(),
      newPassword: z.string().min(8).max(128),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify current password
      const account = await ctx.db.query.account.findFirst({
        where: and(
          eq(account.userId, ctx.user.id),
          eq(account.providerId, 'credential')
        ),
      });
      
      if (!account?.password) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'No password set for this account',
        });
      }
      
      const isValid = await verifyPassword(input.currentPassword, account.password);
      
      if (!isValid) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Current password is incorrect',
        });
      }
      
      // Hash new password
      const hashedPassword = await hashPassword(input.newPassword);
      
      await ctx.db.update(account)
        .set({ password: hashedPassword, updatedAt: new Date() })
        .where(eq(account.id, account.id));
      
      // TODO: Invalidate other sessions?
      
      return { success: true };
    }),

  // Get connected accounts
  getConnectedAccounts: protectedProcedure.query(async ({ ctx }) => {
    const accounts = await ctx.db.query.account.findMany({
      where: eq(account.userId, ctx.user.id),
    });
    
    return accounts.map(a => ({
      provider: a.providerId,
      accountId: a.accountId,
      connectedAt: a.createdAt,
    })).filter(a => a.provider !== 'credential');
  }),

  // Disconnect OAuth account
  disconnectAccount: protectedProcedure
    .input(z.object({ provider: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Check they have another login method
      const accounts = await ctx.db.query.account.findMany({
        where: eq(account.userId, ctx.user.id),
      });
      
      const hasPassword = accounts.some(a => a.providerId === 'credential' && a.password);
      const otherOAuth = accounts.filter(a => a.providerId !== 'credential' && a.providerId !== input.provider);
      
      if (!hasPassword && otherOAuth.length === 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot disconnect the only login method',
        });
      }
      
      await ctx.db.delete(account)
        .where(and(
          eq(account.userId, ctx.user.id),
          eq(account.providerId, input.provider)
        ));
      
      return { success: true };
    }),

  // Get sessions
  getSessions: protectedProcedure.query(async ({ ctx }) => {
    const sessions = await ctx.db.query.session.findMany({
      where: eq(session.userId, ctx.user.id),
      orderBy: [desc(session.updatedAt)],
    });
    
    return sessions.map(s => ({
      id: s.id,
      ipAddress: s.ipAddress,
      userAgent: s.userAgent,
      lastActive: s.updatedAt,
      isCurrent: s.id === ctx.session.id,
    }));
  }),

  // Revoke session
  revokeSession: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (input.sessionId === ctx.session.id) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot revoke current session',
        });
      }
      
      await ctx.db.delete(session)
        .where(and(
          eq(session.id, input.sessionId),
          eq(session.userId, ctx.user.id)
        ));
      
      return { success: true };
    }),

  // Revoke all other sessions
  revokeAllOtherSessions: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.db.delete(session)
      .where(and(
        eq(session.userId, ctx.user.id),
        ne(session.id, ctx.session.id)
      ));
    
    return { success: true };
  }),

  // Upgrade to host
  upgradeToHost: protectedProcedure.mutation(async ({ ctx }) => {
    if (ctx.user.role === 'host') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Already a host',
      });
    }
    
    await ctx.db.update(user)
      .set({ role: 'host', updatedAt: new Date() })
      .where(eq(user.id, ctx.user.id));
    
    return { success: true };
  }),

  // Get notification preferences
  getNotificationPrefs: protectedProcedure.query(async ({ ctx }) => {
    const prefs = await ctx.db.query.userPreferences.findFirst({
      where: eq(userPreferences.userId, ctx.user.id),
    });
    
    // Return defaults if no prefs exist
    return prefs || {
      emailSecurityAlerts: true,
      emailAccountUpdates: true,
      emailAgentStatus: true,
      emailBillingAlerts: true,
      emailNewDeployments: true,
      emailMachineOffline: true,
      emailPayouts: true,
      emailProductUpdates: false,
      emailTips: false,
    };
  }),

  // Update notification preferences
  updateNotificationPrefs: protectedProcedure
    .input(z.object({
      emailSecurityAlerts: z.boolean().optional(),
      emailAccountUpdates: z.boolean().optional(),
      emailAgentStatus: z.boolean().optional(),
      emailBillingAlerts: z.boolean().optional(),
      emailNewDeployments: z.boolean().optional(),
      emailMachineOffline: z.boolean().optional(),
      emailPayouts: z.boolean().optional(),
      emailProductUpdates: z.boolean().optional(),
      emailTips: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .insert(userPreferences)
        .values({
          userId: ctx.user.id,
          ...input,
        })
        .onConflictDoUpdate({
          target: userPreferences.userId,
          set: {
            ...input,
            updatedAt: new Date(),
          },
        });
      
      return { success: true };
    }),

  // Delete account
  deleteAccount: protectedProcedure
    .input(z.object({
      confirmEmail: z.string().email(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (input.confirmEmail !== ctx.user.email) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Email confirmation does not match',
        });
      }
      
      // Cancel all subscriptions
      const userSubscriptions = await ctx.db.query.subscriptions.findMany({
        where: eq(subscriptions.userId, ctx.user.id),
      });
      
      for (const sub of userSubscriptions) {
        if (sub.stripeSubscriptionId) {
          await stripe.subscriptions.cancel(sub.stripeSubscriptionId);
        }
      }
      
      // Stop all agents
      const userAgents = await ctx.db.query.agents.findMany({
        where: eq(agents.userId, ctx.user.id),
      });
      
      for (const agent of userAgents) {
        if (agent.status === 'running') {
          await stopAgent(agent);
        }
      }
      
      // Delete user (cascades to related records)
      await ctx.db.delete(user).where(eq(user.id, ctx.user.id));
      
      // Sign out
      await auth.api.signOut({ headers: headers() });
      
      return { success: true, redirect: '/' };
    }),
}),
```

---

## 5. User Agent Parsing

```typescript
// For displaying friendly session info
import { UAParser } from 'ua-parser-js';

function formatSession(session: Session) {
  const parser = new UAParser(session.userAgent || '');
  const browser = parser.getBrowser();
  const os = parser.getOS();
  
  return {
    browser: browser.name || 'Unknown browser',
    os: os.name || 'Unknown OS',
    device: parser.getDevice().type || 'desktop',
  };
}
```

---

## 6. Validation Rules

| Field | Rules |
|-------|-------|
| name | 1-100 characters |
| image | Valid URL, optional |
| currentPassword | Required for password change |
| newPassword | 8-128 characters |
| confirmEmail | Must match user's email exactly |

---

## 7. Security Considerations

- Password change requires current password
- Cannot disconnect last login method
- Cannot delete current session
- Account deletion requires email confirmation
- Security-sensitive actions should trigger email notification

---

## 8. Testing Scenarios

| Scenario | Expected |
|----------|----------|
| Update name | Profile updated |
| Change password successfully | Password updated, other sessions may be invalidated |
| Change password with wrong current | Error: incorrect password |
| Disconnect only OAuth provider | Error if no password |
| Disconnect OAuth with password set | Provider disconnected |
| Revoke other session | Session invalidated |
| Delete account with wrong email | Error: email doesn't match |
| Delete account with correct email | All data deleted, redirected to home |
| Upgrade user to host | Role changed, new nav items appear |
| Update notification prefs | Preferences saved |
