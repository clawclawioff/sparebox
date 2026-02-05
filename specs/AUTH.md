# Authentication Specification

**Parent:** [MVP.md](./MVP.md)  
**Status:** Draft

---

## 1. Overview

Authentication uses better-auth with:
- Email/password login
- OAuth providers (GitHub, Google)
- Session-based auth with secure cookies
- Role-based access (user, host, admin)

---

## 2. Pages

### 2.1 Login Page

**Route:** `/login`

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                    [Sparebox Logo]                          │
│                                                             │
│                   Welcome back                              │
│              Sign in to your account                        │
│                                                             │
│ ┌─────────────────────────────────────────────────────┐    │
│ │ [Google Icon] Continue with Google                  │    │
│ └─────────────────────────────────────────────────────┘    │
│                                                             │
│ ┌─────────────────────────────────────────────────────┐    │
│ │ [GitHub Icon] Continue with GitHub                  │    │
│ └─────────────────────────────────────────────────────┘    │
│                                                             │
│ ──────────────────── or ────────────────────                │
│                                                             │
│ Email                                                       │
│ ┌─────────────────────────────────────────────────────┐    │
│ │ you@example.com                                     │    │
│ └─────────────────────────────────────────────────────┘    │
│                                                             │
│ Password                                                    │
│ ┌─────────────────────────────────────────────────────┐    │
│ │ ••••••••                              [Show/Hide]   │    │
│ └─────────────────────────────────────────────────────┘    │
│                                                             │
│ [Forgot password?]                                          │
│                                                             │
│ ┌─────────────────────────────────────────────────────┐    │
│ │                     Sign In                         │    │
│ └─────────────────────────────────────────────────────┘    │
│                                                             │
│            Don't have an account? [Sign up]                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Signup Page

**Route:** `/signup`

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                    [Sparebox Logo]                          │
│                                                             │
│                   Create an account                         │
│             Get started with Sparebox                       │
│                                                             │
│ ┌─────────────────────────────────────────────────────┐    │
│ │ [Google Icon] Continue with Google                  │    │
│ └─────────────────────────────────────────────────────┘    │
│                                                             │
│ ┌─────────────────────────────────────────────────────┐    │
│ │ [GitHub Icon] Continue with GitHub                  │    │
│ └─────────────────────────────────────────────────────┘    │
│                                                             │
│ ──────────────────── or ────────────────────                │
│                                                             │
│ Name                                                        │
│ ┌─────────────────────────────────────────────────────┐    │
│ │ Your Name                                           │    │
│ └─────────────────────────────────────────────────────┘    │
│                                                             │
│ Email                                                       │
│ ┌─────────────────────────────────────────────────────┐    │
│ │ you@example.com                                     │    │
│ └─────────────────────────────────────────────────────┘    │
│                                                             │
│ Password                                                    │
│ ┌─────────────────────────────────────────────────────┐    │
│ │ ••••••••                              [Show/Hide]   │    │
│ └─────────────────────────────────────────────────────┘    │
│ At least 8 characters                                       │
│                                                             │
│ I want to:                                                  │
│ ◉ Deploy AI agents (User)                                   │
│ ○ Host AI agents and earn money (Host)                      │
│                                                             │
│ □ I agree to the Terms of Service and Privacy Policy        │
│                                                             │
│ ┌─────────────────────────────────────────────────────┐    │
│ │                   Create Account                    │    │
│ └─────────────────────────────────────────────────────┘    │
│                                                             │
│            Already have an account? [Sign in]               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2.3 Forgot Password

**Route:** `/forgot-password`

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                    [Sparebox Logo]                          │
│                                                             │
│                   Reset your password                       │
│    Enter your email and we'll send you a reset link.        │
│                                                             │
│ Email                                                       │
│ ┌─────────────────────────────────────────────────────┐    │
│ │ you@example.com                                     │    │
│ └─────────────────────────────────────────────────────┘    │
│                                                             │
│ ┌─────────────────────────────────────────────────────┐    │
│ │                  Send Reset Link                    │    │
│ └─────────────────────────────────────────────────────┘    │
│                                                             │
│                 [← Back to sign in]                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2.4 Reset Password

**Route:** `/reset-password`  
**Query:** `?token=xxx`

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                    [Sparebox Logo]                          │
│                                                             │
│                   Set new password                          │
│                                                             │
│ New Password                                                │
│ ┌─────────────────────────────────────────────────────┐    │
│ │ ••••••••                              [Show/Hide]   │    │
│ └─────────────────────────────────────────────────────┘    │
│ At least 8 characters                                       │
│                                                             │
│ Confirm Password                                            │
│ ┌─────────────────────────────────────────────────────┐    │
│ │ ••••••••                              [Show/Hide]   │    │
│ └─────────────────────────────────────────────────────┘    │
│                                                             │
│ ┌─────────────────────────────────────────────────────┐    │
│ │                   Reset Password                    │    │
│ └─────────────────────────────────────────────────────┘    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. better-auth Configuration

```typescript
// src/server/auth/index.ts

import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '@/db';
import * as schema from '@/db/schema';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },
  
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // Update session every 24 hours
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minute cache
    },
  },
  
  advanced: {
    generateId: () => createId(), // Use cuid2 for IDs
  },
  
  trustedOrigins: [
    'https://sparebox.dev',
    process.env.NODE_ENV === 'development' && 'http://localhost:3000',
  ].filter(Boolean) as string[],
});
```

---

## 4. Database Schema (better-auth tables)

```typescript
// src/db/schema.ts

import { pgTable, text, timestamp, boolean, integer } from 'drizzle-orm/pg-core';

// Required by better-auth (singular names)
export const user = pgTable('user', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  name: text('name'),
  image: text('image'),
  
  // Custom fields
  role: text('role', { enum: ['user', 'host', 'admin'] }).notNull().default('user'),
  stripeCustomerId: text('stripe_customer_id'),
  stripeConnectAccountId: text('stripe_connect_account_id'),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  idToken: text('id_token'),
  password: text('password'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
```

---

## 5. Client Integration

### 5.1 Auth Client

```typescript
// src/lib/auth-client.ts

import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient({
  baseURL: typeof window !== 'undefined'
    ? window.location.origin
    : process.env.NEXT_PUBLIC_APP_URL,
});

export const {
  signIn,
  signOut,
  signUp,
  useSession,
  getSession,
} = authClient;
```

### 5.2 Login Form

```tsx
// src/app/(auth)/login/page.tsx

'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from '@/lib/auth-client';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    const { error } = await signIn.email({
      email,
      password,
      callbackURL: callbackUrl,
    });
    
    if (error) {
      setError(error.message || 'Invalid email or password');
      setIsLoading(false);
    } else {
      router.push(callbackUrl);
    }
  }
  
  async function handleOAuthLogin(provider: 'github' | 'google') {
    setIsLoading(true);
    await signIn.social({
      provider,
      callbackURL: callbackUrl,
    });
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-md w-full space-y-8 p-8">
        {/* Logo */}
        <div className="text-center">
          <h1 className="text-2xl font-bold">Welcome back</h1>
          <p className="text-gray-500">Sign in to your account</p>
        </div>
        
        {/* OAuth Buttons */}
        <div className="space-y-3">
          <button
            onClick={() => handleOAuthLogin('google')}
            disabled={isLoading}
            className="w-full btn btn-outline"
          >
            Continue with Google
          </button>
          <button
            onClick={() => handleOAuthLogin('github')}
            disabled={isLoading}
            className="w-full btn btn-outline"
          >
            Continue with GitHub
          </button>
        </div>
        
        <div className="divider">or</div>
        
        {/* Email/Password Form */}
        <form onSubmit={handleEmailLogin} className="space-y-4">
          {error && (
            <div className="alert alert-error">
              {error}
            </div>
          )}
          
          <div>
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="input input-bordered w-full"
            />
          </div>
          
          <div>
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="input input-bordered w-full"
            />
          </div>
          
          <button
            type="submit"
            disabled={isLoading}
            className="w-full btn btn-primary"
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        
        <p className="text-center text-gray-500">
          Don't have an account?{' '}
          <a href="/signup" className="text-primary">Sign up</a>
        </p>
      </div>
    </div>
  );
}
```

### 5.3 Signup Form (with role selection)

```tsx
// Key difference: role selection

const [role, setRole] = useState<'user' | 'host'>('user');

async function handleSignup(e: React.FormEvent) {
  e.preventDefault();
  
  const { error } = await signUp.email({
    email,
    password,
    name,
    callbackURL: '/dashboard',
    // Custom fields passed to hook
  });
  
  // After signup, update role via API
  // (better-auth doesn't support custom fields in signUp directly for email)
  // Alternative: Use a post-signup onboarding flow
}
```

---

## 6. Server-Side Auth

### 6.1 API Route Handler

```typescript
// src/app/api/auth/[...all]/route.ts

import { auth } from '@/server/auth';
import { toNextJsHandler } from 'better-auth/next-js';

export const { GET, POST } = toNextJsHandler(auth);
```

### 6.2 Server Component Auth Check

```typescript
// src/lib/auth-server.ts

import { auth } from '@/server/auth';
import { headers } from 'next/headers';

export async function getServerSession() {
  return auth.api.getSession({
    headers: headers(),
  });
}

// Usage in Server Component:
// const session = await getServerSession();
```

### 6.3 tRPC Context

```typescript
// src/server/api/trpc.ts

import { getServerSession } from '@/lib/auth-server';

export const createTRPCContext = async () => {
  const session = await getServerSession();
  
  return {
    db,
    user: session?.user || null,
    session: session?.session || null,
  };
};

// Protected procedure
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
      session: ctx.session!,
    },
  });
});

// Role-based middleware
export const requireRole = (role: 'user' | 'host' | 'admin') => {
  return t.middleware(({ ctx, next }) => {
    if (ctx.user?.role !== role && ctx.user?.role !== 'admin') {
      throw new TRPCError({ code: 'FORBIDDEN' });
    }
    return next();
  });
};
```

---

## 7. OAuth Setup

### 7.1 GitHub OAuth App

1. Go to GitHub Developer Settings
2. Create new OAuth App
3. Homepage URL: `https://sparebox.dev`
4. Authorization callback: `https://sparebox.dev/api/auth/callback/github`
5. Copy Client ID and Client Secret

### 7.2 Google OAuth

1. Go to Google Cloud Console
2. Create OAuth 2.0 Client ID
3. Authorized redirect URIs: `https://sparebox.dev/api/auth/callback/google`
4. Copy Client ID and Client Secret

### 7.3 Environment Variables

```bash
# .env.local
GITHUB_CLIENT_ID=xxx
GITHUB_CLIENT_SECRET=xxx
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
```

---

## 8. Password Reset Flow

```typescript
// Request reset
await auth.api.forgetPassword({
  body: { email },
});

// Email sent with link: /reset-password?token=xxx

// Reset password
await auth.api.resetPassword({
  body: {
    token,
    newPassword,
  },
});
```

---

## 9. Role Upgrade Flow

When a user wants to become a host:

```typescript
// Settings page or dedicated "Become a Host" flow
billing: router({
  upgradeToHost: protectedProcedure.mutation(async ({ ctx }) => {
    if (ctx.user.role === 'host') {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Already a host' });
    }
    
    await ctx.db.update(user)
      .set({ role: 'host' })
      .where(eq(user.id, ctx.user.id));
    
    return { success: true };
  }),
})
```

---

## 10. Security Considerations

### 10.1 Rate Limiting

```typescript
// Vercel Edge Config or middleware-based rate limiting
// For auth endpoints: 5 requests per minute per IP
```

### 10.2 CSRF Protection

better-auth handles CSRF automatically via:
- SameSite cookie attribute
- Origin header validation

### 10.3 Session Security

- HttpOnly cookies
- Secure flag in production
- SameSite=Lax
- Session rotation on auth events

---

## 11. Testing Scenarios

| Scenario | Expected |
|----------|----------|
| Sign up with valid email | Account created, redirect to dashboard |
| Sign up with existing email | Error: email already in use |
| Sign up with weak password | Error: password too short |
| Login with correct credentials | Session created, redirect to dashboard |
| Login with wrong password | Error: invalid credentials |
| Login with non-existent email | Error: invalid credentials (same message) |
| OAuth with GitHub | Account created/linked, redirect |
| OAuth with Google | Account created/linked, redirect |
| Password reset request | Email sent (or silent success) |
| Password reset with valid token | Password updated |
| Password reset with expired token | Error: token expired |
| Access dashboard without auth | Redirect to /login |
| Access host pages as user | Forbidden or redirect |
