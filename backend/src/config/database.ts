import { Pool, PoolConfig } from 'pg';

const poolConfig: PoolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '15432', 10),
  database: process.env.DB_NAME || 'electron_chat',
  user: process.env.DB_USER || 'electron_user',
  password: process.env.DB_PASSWORD || 'electron_password',
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

class DatabaseConnection {
  private pool: Pool | null = null;
  private isConnected: boolean = false;

  async connect(): Promise<void> {
    if (this.isConnected && this.pool) {
      console.log('Database already connected');
      return;
    }

    try {
      this.pool = new Pool(poolConfig);

      // Test the connection
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();

      this.isConnected = true;
      console.log('✅ Database connected successfully');
      console.log(`   Host: ${poolConfig.host}:${poolConfig.port}`);
      console.log(`   Database: ${poolConfig.database}`);
    } catch (error) {
      this.isConnected = false;
      console.error('❌ Failed to connect to database:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      this.isConnected = false;
      console.log('Database disconnected');
    }
  }

  getPool(): Pool {
    if (!this.pool || !this.isConnected) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.pool;
  }

  isReady(): boolean {
    return this.isConnected && this.pool !== null;
  }
}

// Singleton instance
export const db = new DatabaseConnection();
