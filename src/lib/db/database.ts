import { Pool } from 'pg';

// Singleton pattern for database connection
class Database {
  private static instance: Database;
  private pool: Pool;
  private hasLoggedConnection: boolean = false;

  private constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST || '91.99.163.156',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'tradingbot_db',
      user: process.env.DB_USER || 'tradingbot_user',
      password: process.env.DB_PASSWORD || 'tradingbot_secure_2024',
      max: 20, // Conservative pool size (PostgreSQL has max 100 connections total)
      min: 5, // Keep minimum 5 connections ready
      idleTimeoutMillis: 30000, // 30 seconds idle timeout
      connectionTimeoutMillis: 5000, // 5 seconds connection timeout
      maxUses: 7500, // Close connections after 7500 uses to prevent memory leaks
      allowExitOnIdle: true, // Allow pool to shrink when idle
    });

    // Test connection and warm up pool
    this.pool.on('connect', () => {
      if (!this.hasLoggedConnection) {
        console.log('✅ Connected to PostgreSQL database');
        this.hasLoggedConnection = true;
      }
    });

    this.pool.on('error', (err) => {
      console.error('❌ Unexpected database error:', err);
      // Try to handle connection errors gracefully
      if (err.message.includes('Connection terminated')) {
        console.log('🔄 Attempting to reconnect...');
      }
    });

    // Removed noisy 'remove' event logging
    
    // Warm up the pool by establishing minimum connections immediately
    this.warmUpPool();
  }
  
  /**
   * Warm up the pool by establishing minimum connections
   */
  private async warmUpPool(): Promise<void> {
    try {
      console.log('🔥 Warming up database connection pool...');
      // Execute a simple query to establish initial connections
      await this.pool.query('SELECT 1');
      console.log('✅ Database pool warmed up and ready');
    } catch (error) {
      console.error('⚠️  Failed to warm up pool:', error);
      // Don't throw, just log - app can continue
    }
  }

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  public getPool(): Pool {
    return this.pool;
  }

  public async query(text: string, params?: unknown[], retries = 3) {
    const start = Date.now();
    let lastError;
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const res = await this.pool.query(text, params);
        const duration = Date.now() - start;
        
        if (attempt > 1) {
          console.log(`✅ Query succeeded on attempt ${attempt}`);
        }
        
        // Only log slow queries to reduce noise
        if (duration > 1000) {
          console.log('⚠️  Slow query', { text: text.substring(0, 50), duration, rows: res.rowCount });
        }
        
        return res;
      } catch (error: any) {
        lastError = error;
        const isTimeout = error.message?.includes('timeout') || error.message?.includes('Connection terminated');
        
        if (isTimeout && attempt < retries) {
          console.log(`⏳ Query timeout on attempt ${attempt}/${retries}, retrying...`);
          // Wait a bit before retrying (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, attempt * 500));
        } else {
          console.error('❌ Query error:', error);
          break;
        }
      }
    }
    
    throw lastError;
  }

  public async close(): Promise<void> {
    await this.pool.end();
    console.log('🔌 Database connection closed');
  }
}

export const db = Database.getInstance();
export const pool = db.getPool();

