/**
 * Vector store service for storing and searching embeddings
 * Currently uses in-memory storage as a stub
 * Can be extended to use Qdrant, pgvector, or other vector databases
 */

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
 * In-memory vector store implementation for MVP
 * Uses simple cosine similarity for search
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
 * Singleton instance
 */
export const vectorStoreService: VectorStoreInterface = new InMemoryVectorStore();
