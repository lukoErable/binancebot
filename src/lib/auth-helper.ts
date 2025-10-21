import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getServerSession } from 'next-auth';

/**
 * Get current user ID from session
 * For now, defaults to user 1 (lucasfabregoule@gmail.com) in development
 */
export async function getCurrentUserId(): Promise<number> {
  try {
    const session = await getServerSession(authOptions);
    
    if (session?.user) {
      const userId = (session.user as any).id;
      if (userId) {
        return userId;
      }
    }
  } catch (error) {
    // Session not available (development mode or API route)
  }
  
  // Default to user 1 (lucasfabregoule@gmail.com) in development
  return 1;
}

/**
 * Get user ID synchronously (for contexts where async is not possible)
 * Always returns 1 (lucasfabregoule@gmail.com) for now
 */
export function getCurrentUserIdSync(): number {
  // TODO: Implement proper session management
  // For now, return default user
  return 1;
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const userId = await getCurrentUserId();
  return userId > 0;
}

