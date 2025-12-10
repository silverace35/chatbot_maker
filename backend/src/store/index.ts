import dotenv from 'dotenv';

dotenv.config();

import { IStore } from './IStore';
import { memoryStore } from './memoryStore';
import { postgresStore } from './postgresStore';

// Store mode configuration
// Use STORE_MODE env variable to switch between 'memory' and 'postgres'
const STORE_MODE = process.env.STORE_MODE || 'memory';

export const store: IStore = STORE_MODE === 'postgres' ? postgresStore : memoryStore;

/**
 * Get the current store instance
 * This function allows for dynamic store access
 */
export function getStore(): IStore {
  return store;
}

console.log(`📦 Using ${STORE_MODE.toUpperCase()} store`);
