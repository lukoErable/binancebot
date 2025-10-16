import { Pool } from 'pg';

// Singleton pattern for database connection
class Database {
  private static instance: Database;
  private pool: Pool;

  private constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST || '91.99.163.156',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'tradingbot_db',
      user: process.env.DB_USER || 'tradingbot_user',
      password: process.env.DB_PASSWORD || 'tradingbot_secure_2024',
      max: 20, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Test connection
    this.pool.on('connect', () => {
      console.log('✅ Connected to PostgreSQL database');
    });

    this.pool.on('error', (err) => {
      console.error('❌ Unexpected database error:', err);
    });
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

  public async query(text: string, params?: unknown[]) {
    const start = Date.now();
    try {
      const res = await this.pool.query(text, params);
      const duration = Date.now() - start;
      console.log('📊 Executed query', { text: text.substring(0, 50), duration, rows: res.rowCount });
      return res;
    } catch (error) {
      console.error('❌ Query error:', error);
      throw error;
    }
  }

  public async close(): Promise<void> {
    await this.pool.end();
    console.log('🔌 Database connection closed');
  }
}

export const db = Database.getInstance();
export const pool = db.getPool();

