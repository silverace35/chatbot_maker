/**
 * Embedding service abstraction
 * This service provides an abstraction layer for generating embeddings
 * Supports Ollama embeddings (nomic-embed-text, mxbai-embed-large, etc.)
 *
 * NOTE: Stub implementation has been removed – embeddings are now always
 * generated via Ollama. If Ollama n'est pas disponible, les appels échoueront
 * explicitement plutôt que de faire un fallback silencieux.
 */

import { ollamaService } from './ollamaService';
import { createLogger } from './logger';

const logger = createLogger('EmbeddingService');

export interface EmbeddingResult {
  embedding: number[];
  modelId: string;
  dimensions: number;
}

export interface EmbeddingServiceInterface {
  generateEmbedding(text: string, modelId?: string): Promise<EmbeddingResult>;
  generateEmbeddings(texts: string[], modelId?: string): Promise<EmbeddingResult[]>;
  getDefaultModelId(): string;
  getModelDimensions(modelId: string): number;
  isAvailable(): Promise<boolean>;
}

/**
 * Ollama-based embedding service implementation
 * Uses Ollama API for real embeddings
 */
class OllamaEmbeddingService implements EmbeddingServiceInterface {
  private readonly defaultModelId: string;
  private readonly modelDimensions: Map<string, number>;

  constructor() {
    this.defaultModelId = process.env.EMBEDDING_MODEL || 'nomic-embed-text';

    // Known dimensions for Ollama embedding models
    this.modelDimensions = new Map([
      ['nomic-embed-text', 768],
      ['mxbai-embed-large', 1024],
      ['all-minilm', 384],
      ['bge-large', 1024],
      ['snowflake-arctic-embed', 1024],
    ]);

    logger.info('Ollama embedding service initialized', {
      defaultModel: this.defaultModelId,
      dimensions: this.getModelDimensions(this.defaultModelId),
    });
  }

  async isAvailable(): Promise<boolean> {
    return await ollamaService.isAvailable();
  }

  getDefaultModelId(): string {
    return this.defaultModelId;
  }

  getModelDimensions(modelId: string): number {
    // Return known dimension or default to 768
    return this.modelDimensions.get(modelId) || 768;
  }

  private resolveModelId(requestedModelId?: string): string {
    // If an ancien modelId de stub est encore présent (ex: profils legacy),
    // on le remappe systématiquement vers le modèle Ollama par défaut.
    if (!requestedModelId || requestedModelId === 'stub-embedding-v1') {
      return this.defaultModelId;
    }
    return requestedModelId;
  }

  async generateEmbedding(text: string, modelId?: string): Promise<EmbeddingResult> {
    const model = this.resolveModelId(modelId);

    logger.debug('Generating embedding with Ollama', {
      model,
      textLength: text.length,
    });

    try {
      const embedding = await ollamaService.generateEmbedding(text, model);

      logger.debug('Embedding generated successfully', {
        model,
        dimensions: embedding.length,
      });

      return {
        embedding,
        modelId: model,
        dimensions: embedding.length,
      };
    } catch (error) {
      logger.error('Ollama embedding API error', {
        model,
        textLength: text.length,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error(`Ollama embedding failed for model '${model}': ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async generateEmbeddings(texts: string[], modelId?: string): Promise<EmbeddingResult[]> {
    const model = this.resolveModelId(modelId);

    logger.info('Generating batch embeddings with Ollama', {
      model,
      batchSize: texts.length,
      totalChars: texts.reduce((sum, t) => sum + t.length, 0),
    });

    try {
      const embeddings = await ollamaService.generateEmbeddings(texts, model);

      logger.info('Batch embeddings generated successfully', {
        model,
        count: embeddings.length,
        dimensions: embeddings[0]?.length || 0,
      });

      return embeddings.map(embedding => ({
        embedding,
        modelId: model,
        dimensions: embedding.length,
      }));
    } catch (error) {
      logger.error('Ollama batch embeddings API error', {
        model,
        batchSize: texts.length,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error(`Ollama batch embeddings failed for model '${model}': ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

/**
 * Singleton instance – Ollama only
 */
export const embeddingService: EmbeddingServiceInterface = new OllamaEmbeddingService();
