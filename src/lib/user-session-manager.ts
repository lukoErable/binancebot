import SharedBinanceWebSocket from './shared-binance-websocket';

/**
 * User Session Manager - Manages individual user sessions
 * Each user has their own strategies but shares WebSocket connections
 */

interface UserSession {
  userId: string;
  activeTimeframes: Set<string>;
  primaryTimeframe: string;
  unsubscribeFunctions: Map<string, () => void>;
  lastActivity: number;
  sseCallback?: (data: any) => void;
}

export class UserSessionManager {
  private static instance: UserSessionManager | null = null;
  private sessions: Map<string, UserSession> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;
  
  private constructor() {
    console.log('🚀 UserSessionManager: Created singleton instance');
    
    // Start cleanup of inactive sessions every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupInactiveSessions();
    }, 5 * 60 * 1000);
  }
  
  /**
   * Get singleton instance
   */
  static getInstance(): UserSessionManager {
    if (!this.instance) {
      this.instance = new UserSessionManager();
    }
    return this.instance;
  }
  
  /**
   * Create or update user session
   */
  createSession(userId: string, primaryTimeframe: string = '1m'): UserSession {
    let session = this.sessions.get(userId);
    
    if (!session) {
      session = {
        userId,
        activeTimeframes: new Set(),
        primaryTimeframe,
        unsubscribeFunctions: new Map(),
        lastActivity: Date.now()
      };
      this.sessions.set(userId, session);
      console.log(`👤 New user session: ${userId} (total sessions: ${this.sessions.size})`);
    } else {
      session.lastActivity = Date.now();
    }
    
    return session;
  }
  
  /**
   * Subscribe user to a timeframe
   */
  subscribeToTimeframe(
    userId: string,
    timeframe: string,
    callback: (data: any) => void
  ): void {
    const session = this.sessions.get(userId);
    if (!session) {
      console.error(`❌ No session found for user ${userId}`);
      return;
    }
    
    // Check if already subscribed
    if (session.activeTimeframes.has(timeframe)) {
      console.log(`⚠️  User ${userId} already subscribed to ${timeframe}`);
      return;
    }
    
    // Subscribe to shared WebSocket
    const sharedWS = SharedBinanceWebSocket.getInstance(timeframe);
    const unsubscribe = sharedWS.subscribe((data) => {
      // Update session activity
      session.lastActivity = Date.now();
      
      // Call user's callback with shared data
      callback(data);
    });
    
    // Store unsubscribe function
    session.unsubscribeFunctions.set(timeframe, unsubscribe);
    session.activeTimeframes.add(timeframe);
    
    console.log(`✅ User ${userId} subscribed to ${timeframe} (active: ${session.activeTimeframes.size})`);
  }
  
  /**
   * Unsubscribe user from a timeframe
   */
  unsubscribeFromTimeframe(userId: string, timeframe: string): void {
    const session = this.sessions.get(userId);
    if (!session) return;
    
    const unsubscribe = session.unsubscribeFunctions.get(timeframe);
    if (unsubscribe) {
      unsubscribe();
      session.unsubscribeFunctions.delete(timeframe);
      session.activeTimeframes.delete(timeframe);
      console.log(`👋 User ${userId} unsubscribed from ${timeframe} (remaining: ${session.activeTimeframes.size})`);
    }
  }
  
  /**
   * Set SSE callback for a user
   */
  setSseCallback(userId: string, callback: (data: any) => void): void {
    const session = this.sessions.get(userId);
    if (session) {
      session.sseCallback = callback;
    }
  }
  
  /**
   * Change primary timeframe for user
   */
  changePrimaryTimeframe(userId: string, newTimeframe: string): void {
    const session = this.sessions.get(userId);
    if (session) {
      session.primaryTimeframe = newTimeframe;
      session.lastActivity = Date.now();
      console.log(`🔄 User ${userId} changed primary timeframe to ${newTimeframe}`);
    }
  }
  
  /**
   * Destroy user session (cleanup)
   */
  destroySession(userId: string): void {
    const session = this.sessions.get(userId);
    if (!session) return;
    
    // Unsubscribe from all timeframes
    session.unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
    session.unsubscribeFunctions.clear();
    session.activeTimeframes.clear();
    
    // Remove session
    this.sessions.delete(userId);
    console.log(`🗑️  User session destroyed: ${userId} (remaining sessions: ${this.sessions.size})`);
  }
  
  /**
   * Cleanup inactive sessions (inactive for > 30 minutes)
   */
  private cleanupInactiveSessions(): void {
    const now = Date.now();
    const timeout = 30 * 60 * 1000; // 30 minutes
    
    let cleaned = 0;
    this.sessions.forEach((session, userId) => {
      if (now - session.lastActivity > timeout) {
        this.destroySession(userId);
        cleaned++;
      }
    });
    
    if (cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} inactive session(s)`);
    }
  }
  
  /**
   * Get session info
   */
  getSession(userId: string): UserSession | undefined {
    return this.sessions.get(userId);
  }
  
  /**
   * Get active sessions count
   */
  getActiveSessionsCount(): number {
    return this.sessions.size;
  }
  
  /**
   * Get statistics
   */
  getStats(): {
    totalSessions: number;
    totalSubscriptions: number;
    sharedWebSockets: { timeframe: string; subscribers: number }[];
  } {
    const sharedWS = SharedBinanceWebSocket.getAllInstances();
    const wsStats = Array.from(sharedWS.entries()).map(([tf, ws]) => ({
      timeframe: tf,
      subscribers: ws.getSubscriberCount()
    }));
    
    const totalSubscriptions = Array.from(this.sessions.values())
      .reduce((sum, session) => sum + session.activeTimeframes.size, 0);
    
    return {
      totalSessions: this.sessions.size,
      totalSubscriptions,
      sharedWebSockets: wsStats
    };
  }
}

export default UserSessionManager;

