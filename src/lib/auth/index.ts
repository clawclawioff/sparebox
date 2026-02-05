/**
 * Auth Utilities - Central export for all auth-related functionality
 * 
 * Usage:
 *   import { getSession, requireAuth, requireRole } from '@/lib/auth'
 */

export { getSession, getSessionOrRedirect } from './session'
export { requireAuth, requireGuest, requireRole, type AuthGuard } from './guards'
export { authClient, signIn, signOut, signUp, useSession } from '../auth-client'
