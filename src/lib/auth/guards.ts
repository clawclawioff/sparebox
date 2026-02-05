/**
 * Auth Guards - Reusable authentication/authorization checks
 * 
 * These guards can be used in:
 * - Server Components (via getSession)
 * - Route Handlers
 * - Middleware
 * 
 * Design Philosophy:
 * - Guards are composable functions that check conditions and redirect/throw
 * - Each guard is a pure function for easy testing
 * - Guards can be chained for complex authorization logic
 */

import { redirect } from 'next/navigation'
import { getSession, type Session, type UserRole } from './session'

export interface AuthGuardResult {
  authorized: boolean
  session: Session | null
  reason?: string
}

export type AuthGuard = () => Promise<AuthGuardResult>

/**
 * Require user to be authenticated
 * Redirects to login if not authenticated
 * 
 * @example
 * ```tsx
 * // In a Server Component or Layout
 * export default async function ProtectedPage() {
 *   const session = await requireAuth()
 *   return <div>Hello {session.user.name}</div>
 * }
 * ```
 */
export async function requireAuth(options?: {
  redirectTo?: string
}): Promise<Session> {
  const session = await getSession()
  
  if (!session) {
    const callbackUrl = options?.redirectTo 
      ? `?callbackUrl=${encodeURIComponent(options.redirectTo)}`
      : ''
    redirect(`/login${callbackUrl}`)
  }
  
  return session
}

/**
 * Require user to NOT be authenticated (for login/signup pages)
 * Redirects to dashboard if already authenticated
 * 
 * @example
 * ```tsx
 * // In auth layout
 * export default async function AuthLayout({ children }) {
 *   await requireGuest()  // Redirects if logged in
 *   return <div>{children}</div>
 * }
 * ```
 */
export async function requireGuest(options?: {
  redirectTo?: string
}): Promise<void> {
  const session = await getSession()
  
  if (session) {
    redirect(options?.redirectTo ?? '/dashboard')
  }
}

/**
 * Require user to have a specific role
 * Redirects to appropriate page if not authorized
 * 
 * @example
 * ```tsx
 * // Host-only page
 * export default async function HostPage() {
 *   const session = await requireRole('host')
 *   return <div>Host Dashboard</div>
 * }
 * 
 * // Multiple roles allowed
 * const session = await requireRole(['host', 'admin'])
 * ```
 */
export async function requireRole(
  role: UserRole | UserRole[],
  options?: {
    redirectTo?: string
    unauthorizedRedirect?: string
  }
): Promise<Session> {
  const session = await requireAuth({ redirectTo: options?.redirectTo })
  
  const roles = Array.isArray(role) ? role : [role]
  const userRole = session.user.role
  
  // Admin always has access
  if (userRole === 'admin') {
    return session
  }
  
  if (!roles.includes(userRole)) {
    // Redirect to appropriate page based on their actual role
    const fallback = userRole === 'host' 
      ? '/dashboard/hosts' 
      : '/dashboard/agents'
    
    redirect(options?.unauthorizedRedirect ?? fallback)
  }
  
  return session
}

/**
 * Check authorization without redirecting
 * Useful for conditional UI rendering on server
 * 
 * @example
 * ```tsx
 * const { authorized, session } = await checkAuth()
 * if (!authorized) {
 *   return <PublicView />
 * }
 * return <PrivateView user={session.user} />
 * ```
 */
export async function checkAuth(): Promise<AuthGuardResult> {
  const session = await getSession()
  
  return {
    authorized: !!session,
    session,
  }
}

/**
 * Check role authorization without redirecting
 * 
 * @example
 * ```tsx
 * const { authorized, reason } = await checkRole('host')
 * if (!authorized) {
 *   return <div>Access denied: {reason}</div>
 * }
 * ```
 */
export async function checkRole(
  role: UserRole | UserRole[]
): Promise<AuthGuardResult> {
  const session = await getSession()
  
  if (!session) {
    return {
      authorized: false,
      session: null,
      reason: 'Not authenticated',
    }
  }
  
  const roles = Array.isArray(role) ? role : [role]
  const userRole = session.user.role
  
  // Admin always has access
  if (userRole === 'admin') {
    return { authorized: true, session }
  }
  
  if (!roles.includes(userRole)) {
    return {
      authorized: false,
      session,
      reason: `Requires ${roles.join(' or ')} role, but user has ${userRole} role`,
    }
  }
  
  return { authorized: true, session }
}
