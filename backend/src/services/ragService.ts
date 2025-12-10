import { Resource, ResourceChunk } from '../models/resource';
import { IndexingJob } from '../models/indexingJob';
import { Profile } from '../models/profile';
import { fileStorageService } from './fileStorageService';
import { chunkingService } from './chunkingService';
import { embeddingService } from './embeddingService';
import { vectorStoreService, getCollectionName, VectorPoint } from './vectorStoreService';
import { getStore } from '../store';
import { createLogger } from './logger';

const logger = createLogger('RAGService');

/**
 * RAG Service - handles indexing, search, and prompt augmentation
 */
class RAGService {
  /**
   * Start indexing process for a profile
   * Creates an indexing job and processes all resources
   */
  async startIndexing(profileId: string): Promise<IndexingJob> {
    const store = getStore();

    // Get profile
    const profile = await store.getProfile(profileId);
    if (!profile) {
      logger.error('Cannot start indexing: profile not found', { profileId });
      throw new Error(`Profile ${profileId} not found`);
    }

    if (!profile.ragEnabled) {
      logger.warn('Cannot start indexing: RAG not enabled for profile', { 
        profileId, 
        profileName: profile.name 
      });
      throw new Error(`RAG is not enabled for profile ${profileId}`);
    }

    if (!profile.embeddingModelId) {
      logger.error('Cannot start indexing: no embedding model configured', { 
        profileId,
        profileName: profile.name 
      });
      throw new Error(`No embedding model configured for profile ${profileId}`);
    }

    // Get all resources for this profile
    const resources = await store.listResources(profileId);

    if (resources.length === 0) {
      logger.warn('Cannot start indexing: no resources found', { 
        profileId,
        profileName: profile.name 
      });
      throw new Error(`No resources found for profile ${profileId}`);
    }

    logger.info('Starting indexing job', {
      profileId,
      profileName: profile.name,
      embeddingModel: profile.embeddingModelId,
      resourceCount: resources.length,
      resourceNames: resources.map(r => r.originalName),
    });

    // Create indexing job
    const job = await store.createIndexingJob({
      profileId,
      totalSteps: resources.length,
    });

    // Update profile status
    await store.updateProfile(profileId, { indexStatus: 'pending' });

    // Start processing in background (don't await)
    this.processIndexingJob(job.id, profile, resources).catch(error => {
      logger.error('Error in background indexing job', {
        jobId: job.id,
        profileId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
    });

    return job;
  }

  /**
   * Process an indexing job
   */
  private async processIndexingJob(
    jobId: string,
    profile: Profile,
    resources: Resource[]
  ): Promise<void> {
    const store = getStore();
    const startTime = Date.now();

    try {
      logger.info('Processing indexing job', {
        jobId,
        profileId: profile.id,
        profileName: profile.name,
        resourceCount: resources.length,
      });

      // Update job status
      await store.updateIndexingJob(jobId, {
        status: 'processing',
        processedSteps: 0,
        totalSteps: resources.length,
        progress: 0,
      });

      // Update profile status
      await store.updateProfile(profile.id, { indexStatus: 'processing' });

      // Determine embedding model: prefer profile-specific model, otherwise use service default
      const embeddingModelId = profile.embeddingModelId || embeddingService.getDefaultModelId();
      const collectionName = getCollectionName(profile.id, embeddingModelId);
      const vectorSize = embeddingService.getModelDimensions(embeddingModelId);

      logger.info('Embedding configuration', {
        jobId,
        profileId: profile.id,
        embeddingModel: embeddingModelId,
        vectorSize,
        collectionName,
      });

      // Ensure collection exists
      await vectorStoreService.ensureCollection(collectionName, vectorSize);

      // Process each resource
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < resources.length; i++) {
        const resource = resources[i];

        try {
          logger.info('Indexing resource', {
            jobId,
            profileId: profile.id,
            resourceId: resource.id,
            resourceName: resource.originalName,
            resourceType: resource.type,
            sizeBytes: resource.sizeBytes,
            progress: `${i + 1}/${resources.length}`,
          });

          await this.indexResource(profile, resource, embeddingModelId, collectionName);

          // Mark resource as indexed
          await store.updateResource(resource.id, { indexed: true });

          successCount++;

          logger.info('Resource indexed successfully', {
            jobId,
            profileId: profile.id,
            resourceId: resource.id,
            resourceName: resource.originalName,
            progress: `${i + 1}/${resources.length}`,
          });

          // Update job progress
          const processedSteps = i + 1;
          const progress = Math.round((processedSteps / resources.length) * 100);

          await store.updateIndexingJob(jobId, {
            processedSteps,
            totalSteps: resources.length,
            progress,
          });
        } catch (error) {
          errorCount++;
          logger.error('Error indexing resource', {
            jobId,
            profileId: profile.id,
            resourceId: resource.id,
            resourceName: resource.originalName,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
          });
          // Continue with other resources
        }
      }

      const duration = Date.now() - startTime;

      // Mark job as completed
      await store.updateIndexingJob(jobId, {
        status: 'completed',
        processedSteps: resources.length,
        totalSteps: resources.length,
        progress: 100,
      });

      // Update profile status
      await store.updateProfile(profile.id, { indexStatus: 'ready' });

      logger.info('Indexing job completed', {
        jobId,
        profileId: profile.id,
        profileName: profile.name,
        totalResources: resources.length,
        successCount,
        errorCount,
        durationMs: duration,
        durationSec: (duration / 1000).toFixed(2),
      });

    } catch (error) {
      const duration = Date.now() - startTime;

      logger.error('Indexing job failed', {
        jobId,
        profileId: profile.id,
        profileName: profile.name,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        durationMs: duration,
      });

      // Mark job as failed
      await store.updateIndexingJob(jobId, {
        status: 'failed',
        progress: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Update profile status
      await store.updateProfile(profile.id, { indexStatus: 'error' });
    }
  }

  /**
   * Index a single resource
   */
  private async indexResource(
    profile: Profile,
    resource: Resource,
    embeddingModelId: string,
    collectionName: string
  ): Promise<void> {
    const store = getStore();
    const resourceStartTime = Date.now();

    logger.debug('Reading resource content', {
      profileId: profile.id,
      resourceId: resource.id,
      resourceName: resource.originalName,
      resourceType: resource.type,
      contentPath: resource.contentPath,
    });

    // Read file content
    let content: string;
    if (resource.type === 'text') {
      // For text resources, content is stored directly
      content = await fileStorageService.readFileAsText(resource.contentPath);
    } else {
      // For file resources, extract text
      const fileBuffer = await fileStorageService.readFile(resource.contentPath);
      const mimeType = resource.mimeType || 'text/plain';
      const extractedText = chunkingService.extractText(fileBuffer, mimeType);
      content = chunkingService.cleanText(extractedText);
    }

    logger.debug('Content extracted', {
      profileId: profile.id,
      resourceId: resource.id,
      resourceName: resource.originalName,
      contentLength: content.length,
    });

    // Chunk the text
    const chunks = chunkingService.chunkText(content, {
      chunkSize: 500,
      chunkOverlap: 50,
    });

    logger.info('Text chunked', {
      profileId: profile.id,
      resourceId: resource.id,
      resourceName: resource.originalName,
      chunkCount: chunks.length,
      avgChunkSize: chunks.length > 0 
        ? Math.round(chunks.reduce((sum, c) => sum + c.content.length, 0) / chunks.length)
        : 0,
    });

    // Store chunks in database
    const chunkIds: string[] = [];
    for (const chunk of chunks) {
      const chunkId = await store.createResourceChunk({
        resourceId: resource.id,
        profileId: profile.id,
        chunkIndex: chunk.index,
        content: chunk.content,
        metadata: chunk.metadata || {},
      });
      chunkIds.push(chunkId);
    }

    logger.debug('Chunks stored in database', {
      profileId: profile.id,
      resourceId: resource.id,
      chunkCount: chunkIds.length,
    });

    // Generate embeddings
    logger.info('Generating embeddings for resource', {
      profileId: profile.id,
      resourceId: resource.id,
      resourceName: resource.originalName,
      chunkCount: chunks.length,
      embeddingModel: embeddingModelId,
    });

    const embeddingStartTime = Date.now();
    const chunkContents = chunks.map(c => c.content);
    // Let the embedding service choose an appropriate default model when none is specified
    const embeddings = await embeddingService.generateEmbeddings(chunkContents, embeddingModelId);
    const embeddingDuration = Date.now() - embeddingStartTime;

    logger.info('Embeddings generated', {
      profileId: profile.id,
      resourceId: resource.id,
      resourceName: resource.originalName,
      embeddingCount: embeddings.length,
      embeddingModel: embeddingModelId,
      vectorDimensions: embeddings[0]?.dimensions || 0,
      durationMs: embeddingDuration,
    });

    // Prepare vector points
    const points: VectorPoint[] = embeddings.map((emb, idx) => {
      const chunkId = chunkIds[idx];
      const vectorId = `${chunkId}_${embeddingModelId}`;

      return {
        id: vectorId,
        vector: emb.embedding,
        payload: {
          chunkId,
          profileId: profile.id,
          resourceId: resource.id,
          content: chunks[idx].content,
          embeddingModelId,
          metadata: {
            originalName: resource.originalName,
            chunkIndex: chunks[idx].index,
            ...chunks[idx].metadata,
          },
        },
      };
    });

    // Store vectors
    logger.debug('Storing vectors in vector store', {
      profileId: profile.id,
      resourceId: resource.id,
      vectorCount: points.length,
      collectionName,
    });

    await vectorStoreService.upsertVectors(collectionName, points);

    // Store embedding metadata
    for (let i = 0; i < points.length; i++) {
      await store.createResourceEmbedding({
        chunkId: chunkIds[i],
        profileId: profile.id,
        embeddingModelId,
        vectorId: points[i].id,
      });
    }

    const totalDuration = Date.now() - resourceStartTime;

    logger.info('Resource indexing complete', {
      profileId: profile.id,
      resourceId: resource.id,
      resourceName: resource.originalName,
      chunksIndexed: chunks.length,
      vectorsStored: points.length,
      totalDurationMs: totalDuration,
      embeddingDurationMs: embeddingDuration,
    });
  }

  /**
   * Search for similar content in a profile's knowledge base
   */
  async searchSimilar(
    profileId: string,
    query: string,
    topK?: number
  ): Promise<Array<{ content: string; score: number; metadata: any }>> {
    const store = getStore();

    logger.debug('Searching in profile knowledge base', {
      profileId,
      queryLength: query.length,
      topK,
    });

    // Get profile
    const profile = await store.getProfile(profileId);
    if (!profile) {
      logger.error('Search failed: profile not found', { profileId });
      throw new Error(`Profile ${profileId} not found`);
    }

    if (!profile.ragEnabled || profile.indexStatus !== 'ready') {
      logger.info('Search skipped: RAG not enabled or index not ready', {
        profileId,
        ragEnabled: profile.ragEnabled,
        indexStatus: profile.indexStatus,
      });
      return [];
    }

    const embeddingModelId = profile.embeddingModelId || embeddingService.getDefaultModelId();
    const collectionName = getCollectionName(profileId, embeddingModelId);
    const k = topK || profile.ragSettings.topK || 5;
    const threshold = profile.ragSettings.similarityThreshold || 0.7;

    logger.debug('Generating query embedding', {
      profileId,
      embeddingModel: embeddingModelId,
      query: query.substring(0, 100) + (query.length > 100 ? '...' : ''),
    });

    // Generate query embedding
    const queryEmbedding = await embeddingService.generateEmbedding(query, embeddingModelId);

    logger.debug('Searching vector store', {
      profileId,
      collectionName,
      topK: k,
      similarityThreshold: threshold,
    });

    // Search in vector store
    const results = await vectorStoreService.search(
      collectionName,
      queryEmbedding.embedding,
      k,
      threshold
    );

    logger.info('Vector search completed', {
      profileId,
      resultsFound: results.length,
      topScores: results.slice(0, 3).map(r => r.score),
    });

    return results.map(result => ({
      content: result.payload.content,
      score: result.score,
      metadata: {
        resourceId: result.payload.resourceId,
        chunkId: result.payload.chunkId,
        ...result.payload.metadata,
      },
    }));
  }

  /**
   * Augment a prompt with RAG context
   */
  async augmentPrompt(
    profile: Profile,
    userMessage: string
  ): Promise<string> {
    if (!profile.ragEnabled || profile.indexStatus !== 'ready') {
      logger.debug('Prompt augmentation skipped: RAG not available', {
        profileId: profile.id,
        ragEnabled: profile.ragEnabled,
        indexStatus: profile.indexStatus,
      });
      return userMessage;
    }

    try {
      logger.info('Augmenting prompt with RAG context', {
        profileId: profile.id,
        profileName: profile.name,
        messageLength: userMessage.length,
      });

      // Search for relevant context
      const results = await this.searchSimilar(profile.id, userMessage);

      if (results.length === 0) {
        logger.info('No relevant context found for prompt augmentation', {
          profileId: profile.id,
        });
        return userMessage;
      }

      // Build context string
      const contextParts = results.map((result, idx) =>
        `[Context ${idx + 1}] (relevance: ${(result.score * 100).toFixed(1)}%)\n${result.content}`
      );

      const context = contextParts.join('\n\n');

      // Augment the prompt
      const augmentedPrompt = `En te basant sur les informations suivantes, réponds à la question de l'utilisateur.

Contexte:
${context}

Question de l'utilisateur:
${userMessage}

Réponds en utilisant le contexte fourni si pertinent.`;

      logger.info('Prompt augmented successfully', {
        profileId: profile.id,
        contextChunks: results.length,
        originalLength: userMessage.length,
        augmentedLength: augmentedPrompt.length,
        topRelevanceScores: results.slice(0, 3).map(r => r.score),
      });

      return augmentedPrompt;
    } catch (error) {
      logger.error('Error augmenting prompt with RAG', {
        profileId: profile.id,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      return userMessage;
    }
  }

  /**
   * Delete indexed data for a resource
   */
  async deleteResourceIndex(resourceId: string): Promise<void> {
    const store = getStore();

    logger.info('Deleting resource index', { resourceId });

    try {
      // Get all chunks for this resource
      const chunks = await store.listResourceChunks(resourceId);

      logger.debug('Found chunks to delete', {
        resourceId,
        chunkCount: chunks.length,
      });

      let deletedVectorCount = 0;
      let deletedEmbeddingCount = 0;

      // Get all embeddings for these chunks
      for (const chunk of chunks) {
        const embeddings = await store.listResourceEmbeddings(chunk.id);

        // Delete vectors from vector store
        for (const embedding of embeddings) {
          try {
            const profile = await store.getProfile(embedding.profileId);
            if (profile && profile.embeddingModelId) {
              const collectionName = getCollectionName(embedding.profileId, embedding.embeddingModelId);
              await vectorStoreService.deleteVectors(collectionName, [embedding.vectorId]);
              deletedVectorCount++;
            }

            // Delete embedding metadata
            await store.deleteResourceEmbedding(embedding.id);
            deletedEmbeddingCount++;
          } catch (error) {
            logger.error('Error deleting vector/embedding', {
              resourceId,
              chunkId: chunk.id,
              embeddingId: embedding.id,
              vectorId: embedding.vectorId,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }

        // Delete chunk
        await store.deleteResourceChunk(chunk.id);
      }

      logger.info('Resource index deleted successfully', {
        resourceId,
        deletedChunks: chunks.length,
        deletedVectors: deletedVectorCount,
        deletedEmbeddings: deletedEmbeddingCount,
      });
    } catch (error) {
      logger.error('Error deleting resource index', {
        resourceId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }
}

export const ragService = new RAGService();
