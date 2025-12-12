/**
 * Vector store service for storing and searching embeddings
 * Supports Qdrant (production) and in-memory (fallback)
 */

import { QdrantClient } from '@qdrant/js-client-rest';

export interface VectorPoint {
  id: string;
  vector: number[];
  payload: {
    chunkId: string;
    profileId: string;
    resourceId: string;
    content: string;
    embeddingModelId: string;
    metadata?: Record<string, any>;
  };
}

export interface SearchResult {
  id: string;
  score: number;
  payload: VectorPoint['payload'];
}

export interface VectorStoreInterface {
  upsertVectors(collectionName: string, points: VectorPoint[]): Promise<void>;
  search(collectionName: string, vector: number[], limit: number, scoreThreshold?: number): Promise<SearchResult[]>;
  deleteVectors(collectionName: string, ids: string[]): Promise<void>;
  deleteCollection(collectionName: string): Promise<void>;
  ensureCollection(collectionName: string, vectorSize: number): Promise<void>;
}

/**
 * Qdrant vector store implementation
 */
class QdrantVectorStore implements VectorStoreInterface {
  private client: QdrantClient;
  private existingCollections: Set<string> = new Set();

  constructor() {
    const qdrantUrl = process.env.QDRANT_URL || 'http://localhost:6333';
    console.log(`[VectorStore] Connecting to Qdrant at ${qdrantUrl}`);
    this.client = new QdrantClient({ url: qdrantUrl });
  }

  async ensureCollection(collectionName: string, vectorSize: number): Promise<void> {
    // Check cache first
    if (this.existingCollections.has(collectionName)) {
      return;
    }

    try {
      // Check if collection exists
      const collections = await this.client.getCollections();
      const exists = collections.collections.some(c => c.name === collectionName);

      if (!exists) {
        // Create collection
        await this.client.createCollection(collectionName, {
          vectors: {
            size: vectorSize,
            distance: 'Cosine',
          },
        });
        console.log(`[VectorStore] Created Qdrant collection: ${collectionName} with vector size ${vectorSize}`);
      } else {
        console.log(`[VectorStore] Qdrant collection already exists: ${collectionName}`);
      }

      this.existingCollections.add(collectionName);
    } catch (error) {
      console.error(`[VectorStore] Error ensuring collection ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Generate a valid UUID v4-like string from an input string (deterministic)
   * Format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
   */
  private stringToUUID(str: string): string {
    // Create multiple hashes for better distribution
    const hashes: number[] = [];
    for (let seed = 0; seed < 4; seed++) {
      let hash = seed * 0x9e3779b9; // Golden ratio
      for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
      }
      hashes.push(Math.abs(hash));
    }
    
    // Format as proper UUID v4: 8-4-4-4-12 hex chars
    const hex = hashes.map(h => h.toString(16).padStart(8, '0')).join('');

    return [
      hex.slice(0, 8),
      hex.slice(8, 12),
      '4' + hex.slice(13, 16), // Version 4
      ((parseInt(hex.slice(16, 17), 16) & 0x3) | 0x8).toString(16) + hex.slice(17, 20), // Variant
      hex.slice(20, 32),
    ].join('-');
  }

  async upsertVectors(collectionName: string, points: VectorPoint[]): Promise<void> {
    try {
      // Convert to Qdrant format - use proper UUID strings
      const qdrantPoints = points.map((point) => {
        const uuid = this.stringToUUID(point.id);
        console.log(`[VectorStore] Generated UUID ${uuid} for point ${point.id.substring(0, 30)}...`);
        return {
          id: uuid,
          vector: point.vector,
          payload: {
            ...point.payload,
            originalId: point.id,
          },
        };
      });

      await this.client.upsert(collectionName, {
        wait: true,
        points: qdrantPoints,
      });

      console.log(`[VectorStore] Upserted ${points.length} vectors to Qdrant collection ${collectionName}`);
    } catch (error) {
      console.error(`[VectorStore] Error upserting vectors to ${collectionName}:`, error);
      throw error;
    }
  }

  async search(
    collectionName: string,
    vector: number[],
    limit: number,
    scoreThreshold: number = 0.0
  ): Promise<SearchResult[]> {
    try {
      // Log la taille du vecteur de requête
      console.log(`[VectorStore] Searching in ${collectionName}, vector size: ${vector.length}, limit: ${limit}, threshold: ${scoreThreshold}`);

      // Vérifier d'abord si la collection existe et combien de points elle contient
      try {
        const collectionInfo = await this.client.getCollection(collectionName);
        console.log(`[VectorStore] Collection ${collectionName} has ${collectionInfo.points_count} points, indexed: ${collectionInfo.indexed_vectors_count}`);
      } catch (infoError) {
        console.log(`[VectorStore] Could not get collection info: ${infoError}`);
      }

      const results = await this.client.search(collectionName, {
        vector,
        limit,
        score_threshold: scoreThreshold,
        with_payload: true,
      });

      console.log(`[VectorStore] Search in ${collectionName} returned ${results.length} results`);

      // Log les scores des premiers résultats
      if (results.length > 0) {
        console.log(`[VectorStore] Top scores: ${results.slice(0, 5).map(r => r.score.toFixed(4)).join(', ')}`);
      }

      return results.map(result => ({
        id: result.payload?.originalId as string || String(result.id),
        score: result.score,
        payload: {
          chunkId: result.payload?.chunkId as string,
          profileId: result.payload?.profileId as string,
          resourceId: result.payload?.resourceId as string,
          content: result.payload?.content as string,
          embeddingModelId: result.payload?.embeddingModelId as string,
          metadata: result.payload?.metadata as Record<string, any>,
        },
      }));
    } catch (error: any) {
      // If collection doesn't exist, return empty results
      if (error?.status === 404) {
        console.log(`[VectorStore] Collection ${collectionName} not found, returning empty results`);
        return [];
      }
      console.error(`[VectorStore] Error searching in ${collectionName}:`, error);
      throw error;
    }
  }

  async deleteVectors(collectionName: string, ids: string[]): Promise<void> {
    try {
      // Qdrant expects point IDs - we stored original string IDs in payload
      // For now, we'll delete by filter
      for (const id of ids) {
        await this.client.delete(collectionName, {
          wait: true,
          filter: {
            must: [
              {
                key: 'originalId',
                match: { value: id },
              },
            ],
          },
        });
      }

      console.log(`[VectorStore] Deleted ${ids.length} vectors from Qdrant collection ${collectionName}`);
    } catch (error) {
      console.error(`[VectorStore] Error deleting vectors from ${collectionName}:`, error);
      throw error;
    }
  }

  async deleteCollection(collectionName: string): Promise<void> {
    try {
      await this.client.deleteCollection(collectionName);
      this.existingCollections.delete(collectionName);
      console.log(`[VectorStore] Deleted Qdrant collection: ${collectionName}`);
    } catch (error: any) {
      // Ignore if collection doesn't exist
      if (error?.status !== 404) {
        console.error(`[VectorStore] Error deleting collection ${collectionName}:`, error);
        throw error;
      }
    }
  }
}

/**
 * In-memory vector store implementation (fallback)
 */
class InMemoryVectorStore implements VectorStoreInterface {
  private collections: Map<string, Map<string, VectorPoint>> = new Map();

  async ensureCollection(collectionName: string, vectorSize: number): Promise<void> {
    if (!this.collections.has(collectionName)) {
      this.collections.set(collectionName, new Map());
      console.log(`Created collection: ${collectionName} with vector size ${vectorSize}`);
    }
  }

  async upsertVectors(collectionName: string, points: VectorPoint[]): Promise<void> {
    let collection = this.collections.get(collectionName);
    
    if (!collection) {
      collection = new Map();
      this.collections.set(collectionName, collection);
    }

    for (const point of points) {
      collection.set(point.id, point);
    }

    console.log(`Upserted ${points.length} vectors to collection ${collectionName}`);
  }

  async search(
    collectionName: string,
    vector: number[],
    limit: number,
    scoreThreshold: number = 0.0
  ): Promise<SearchResult[]> {
    const collection = this.collections.get(collectionName);

    if (!collection || collection.size === 0) {
      return [];
    }

    // Calculate cosine similarity for all points
    const results: SearchResult[] = [];

    for (const [id, point] of collection.entries()) {
      const score = this.cosineSimilarity(vector, point.vector);

      if (score >= scoreThreshold) {
        results.push({
          id,
          score,
          payload: point.payload,
        });
      }
    }

    // Sort by score descending and limit
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit);
  }

  async deleteVectors(collectionName: string, ids: string[]): Promise<void> {
    const collection = this.collections.get(collectionName);

    if (!collection) {
      return;
    }

    for (const id of ids) {
      collection.delete(id);
    }

    console.log(`Deleted ${ids.length} vectors from collection ${collectionName}`);
  }

  async deleteCollection(collectionName: string): Promise<void> {
    this.collections.delete(collectionName);
    console.log(`Deleted collection: ${collectionName}`);
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const magnitude = Math.sqrt(normA) * Math.sqrt(normB);

    if (magnitude === 0) {
      return 0;
    }

    return dotProduct / magnitude;
  }
}

/**
 * Get collection name for a profile and embedding model
 */
export function getCollectionName(profileId: string, embeddingModelId: string): string {
  return `profile_${profileId}_${embeddingModelId}`;
}

/**
 * Create the appropriate vector store based on environment
 */
function createVectorStore(): VectorStoreInterface {
  const useQdrant = process.env.USE_QDRANT !== 'false'; // Default to true

  if (useQdrant) {
    try {
      console.log('[VectorStore] Using Qdrant vector store');
      return new QdrantVectorStore();
    } catch (error) {
      console.warn('[VectorStore] Failed to initialize Qdrant, falling back to in-memory:', error);
      return new InMemoryVectorStore();
    }
  } else {
    console.log('[VectorStore] Using in-memory vector store');
    return new InMemoryVectorStore();
  }
}

/**
 * Singleton instance
 */
export const vectorStoreService: VectorStoreInterface = createVectorStore();
