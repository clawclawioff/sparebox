/**
 * Server-side session utilities
 * 
 * These functions are designed for use in:
 * - Server Components
 * - Route Handlers
 * - Middleware
 * - tRPC context
 */

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/server/auth'

export type UserRole = 'user' | 'host' | 'admin'

export interface SessionUser {
  id: string
  email: string
  name: string | null
  image: string | null
  role: UserRole
  emailVerified: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Session {
  user: SessionUser
  session: {
    id: string
    userId: string
    token: string
    expiresAt: Date
  }
}

/**
 * Get the current session (or null if not authenticated)
 * 
 * @example
 * ```tsx
 * // In a Server Component
 * const session = await getSession()
 * if (session) {
 *   console.log(session.user.email)
 * }
 * ```
 */
export async function getSession(): Promise<Session | null> {
  try {
    const result = await auth.api.getSession({
      headers: await headers(),
    })
    
    if (!result?.user) {
      return null
    }
    
    // Map to our Session type, providing defaults for custom fields
    const session: Session = {
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name ?? null,
        image: result.user.image ?? null,
        role: ((result.user as any).role as UserRole) || 'user',
        emailVerified: result.user.emailVerified ?? false,
        createdAt: result.user.createdAt,
        updatedAt: result.user.updatedAt,
      },
      session: {
        id: result.session.id,
        userId: result.session.userId,
        token: result.session.token,
        expiresAt: result.session.expiresAt,
      },
    }
    
    return session
  } catch (error) {
    console.error('Failed to get session:', error)
    return null
  }
}

/**
 * Get session or redirect to login
 * 
 * @param redirectTo - Where to redirect after login (defaults to current path)
 * 
 * @example
 * ```tsx
 * // In a Server Component - will redirect if not logged in
 * const session = await getSessionOrRedirect()
 * // session is guaranteed to exist here
 * ```
 */
export async function getSessionOrRedirect(redirectTo?: string): Promise<Session> {
  const session = await getSession()
  
  if (!session) {
    const callbackUrl = redirectTo ? `?callbackUrl=${encodeURIComponent(redirectTo)}` : ''
    redirect(`/login${callbackUrl}`)
  }
  
  return session
}

/**
 * Check if user has a specific role
 */
export function hasRole(user: SessionUser, role: UserRole | UserRole[]): boolean {
  const roles = Array.isArray(role) ? role : [role]
  
  // Admin has access to everything
  if (user.role === 'admin') {
    return true
  }
  
  return roles.includes(user.role)
}

/**
 * Check if user can access host-only features
 */
export function isHost(user: SessionUser): boolean {
  return hasRole(user, ['host', 'admin'])
}

/**
 * Check if user can access user-only features
 */
export function isUser(user: SessionUser): boolean {
  return hasRole(user, ['user', 'admin'])
}
