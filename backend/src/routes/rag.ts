import { Router, Request, Response } from 'express';
import { getStore } from '../store';
import { ragService } from '../services/ragService';
import { fileStorageService } from '../services/fileStorageService';
import multer from 'multer';
import * as path from 'path';
import { createLogger } from '../services/logger';

const logger = createLogger('RAGRoutes');
const router = Router();

// Configure multer for file uploads (store in memory temporarily)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

/**
 * POST /api/profile/:profileId/resources/upload
 * Upload one or more files for a profile
 */
router.post('/:profileId/resources/upload', upload.array('files', 10), async (req: Request, res: Response) => {
  const { profileId } = req.params;
  const files = req.files as Express.Multer.File[];

  try {
    logger.info('Upload request received', {
      profileId,
      fileCount: files?.length || 0,
      filenames: files?.map(f => f.originalname) || [],
    });

    if (!files || files.length === 0) {
      logger.warn('Upload rejected: no files provided', { profileId });
      return res.status(400).json({ error: 'No files provided' });
    }

    const store = getStore();

    // Verify profile exists
    const profile = await store.getProfile(profileId);
    if (!profile) {
      logger.error('Upload rejected: profile not found', { profileId });
      return res.status(404).json({ error: 'Profile not found' });
    }

    logger.info('Storing uploaded files', {
      profileId,
      profileName: profile.name,
      fileCount: files.length,
    });

    // Store files and create resources
    const resources = [];
    for (const file of files) {
      logger.debug('Storing file', {
        profileId,
        filename: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
      });

      // Store file on disk
      const contentPath = await fileStorageService.storeFile(
        profileId,
        file.originalname,
        file.buffer
      );

      // Create resource record
      const resource = await store.createResource({
        profileId,
        type: 'file',
        originalName: file.originalname,
        contentPath,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        metadata: {
          uploadedAt: new Date().toISOString(),
        },
      });

      logger.info('File added to profile', {
        profileId,
        profileName: profile.name,
        resourceId: resource.id,
        filename: file.originalname,
        sizeBytes: file.size,
        storedPath: contentPath,
      });

      resources.push(resource);
    }

    // Mark profile index as stale if it was ready
    if (profile.ragEnabled && profile.indexStatus === 'ready') {
      await store.updateProfile(profileId, { indexStatus: 'stale' });
      logger.info('Profile index marked as stale (re-indexing required)', {
        profileId,
        profileName: profile.name,
      });
    }

    logger.info('Upload completed successfully', {
      profileId,
      profileName: profile.name,
      filesAdded: resources.length,
      resourceIds: resources.map(r => r.id),
    });

    return res.status(201).json({ resources });
  } catch (error) {
    logger.error('Upload failed', {
      profileId,
      fileCount: files?.length || 0,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/profile/:profileId/resources/text
 * Add text content as a resource
 */
router.post('/:profileId/resources/text', async (req: Request, res: Response) => {
  const { profileId } = req.params;
  const { name, content } = req.body;

  try {
    logger.info('Text resource add request', {
      profileId,
      name,
      contentLength: content?.length || 0,
    });

    if (!content || content.trim().length === 0) {
      logger.warn('Text resource rejected: empty content', { profileId, name });
      return res.status(400).json({ error: 'content is required' });
    }

    const store = getStore();

    // Verify profile exists
    const profile = await store.getProfile(profileId);
    if (!profile) {
      logger.error('Text resource rejected: profile not found', { profileId });
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Store text content
    const filename = name || `text_${Date.now()}.txt`;
    const contentPath = await fileStorageService.storeFile(
      profileId,
      filename,
      content
    );

    // Create resource record
    const resource = await store.createResource({
      profileId,
      type: 'text',
      originalName: filename,
      contentPath,
      mimeType: 'text/plain',
      sizeBytes: Buffer.byteLength(content, 'utf-8'),
      metadata: {
        addedAt: new Date().toISOString(),
      },
    });

    logger.info('Text resource added to profile', {
      profileId,
      profileName: profile.name,
      resourceId: resource.id,
      filename,
      contentLength: content.length,
      storedPath: contentPath,
    });

    // Mark profile index as stale if it was ready
    if (profile.ragEnabled && profile.indexStatus === 'ready') {
      await store.updateProfile(profileId, { indexStatus: 'stale' });
      logger.info('Profile index marked as stale (re-indexing required)', {
        profileId,
        profileName: profile.name,
      });
    }

    return res.status(201).json(resource);
  } catch (error) {
    logger.error('Text resource add failed', {
      profileId,
      name,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/profile/:profileId/resources
 * List all resources for a profile
 */
router.get('/:profileId/resources', async (req: Request, res: Response) => {
  try {
    const { profileId } = req.params;
    const store = getStore();

    // Verify profile exists
    const profile = await store.getProfile(profileId);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const resources = await store.listResources(profileId);
    return res.json({ resources });
  } catch (error) {
    console.error('Error in GET /api/profile/:profileId/resources:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/profile/:profileId/resources/:resourceId
 * Delete a resource
 */
router.delete('/:profileId/resources/:resourceId', async (req: Request, res: Response) => {
  const { profileId, resourceId } = req.params;

  try {
    logger.info('Resource deletion request', { profileId, resourceId });

    const store = getStore();

    // Get resource
    const resource = await store.getResource(resourceId);
    if (!resource) {
      logger.warn('Resource deletion failed: resource not found', {
        profileId,
        resourceId,
      });
      return res.status(404).json({ error: 'Resource not found' });
    }

    if (resource.profileId !== profileId) {
      logger.warn('Resource deletion forbidden: resource belongs to different profile', {
        profileId,
        resourceId,
        actualProfileId: resource.profileId,
      });
      return res.status(403).json({ error: 'Resource does not belong to this profile' });
    }

    logger.info('Deleting resource', {
      profileId,
      resourceId,
      resourceName: resource.originalName,
      resourceType: resource.type,
      contentPath: resource.contentPath,
    });

    // Delete indexed data
    await ragService.deleteResourceIndex(resourceId);

    // Delete file from disk
    await fileStorageService.deleteFile(resource.contentPath);
    logger.debug('Resource file deleted from disk', {
      profileId,
      resourceId,
      contentPath: resource.contentPath,
    });

    // Delete resource record
    await store.deleteResource(resourceId);
    logger.debug('Resource record deleted from database', {
      profileId,
      resourceId,
    });

    // Mark profile index as stale if it was ready
    const profile = await store.getProfile(profileId);
    if (profile && profile.ragEnabled && profile.indexStatus === 'ready') {
      await store.updateProfile(profileId, { indexStatus: 'stale' });
      logger.info('Profile index marked as stale after deletion', {
        profileId,
        profileName: profile.name,
      });
    }

    logger.info('Resource deleted successfully', {
      profileId,
      resourceId,
      resourceName: resource.originalName,
    });

    return res.status(204).send();
  } catch (error) {
    logger.error('Resource deletion failed', {
      profileId,
      resourceId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/profile/:profileId/index
 * Start indexing process for a profile
 */
router.post('/:profileId/index', async (req: Request, res: Response) => {
  const { profileId } = req.params;

  try {
    logger.info('Indexing request received', { profileId });

    // Start indexing
    const job = await ragService.startIndexing(profileId);

    logger.info('Indexing job created successfully', {
      profileId,
      jobId: job.id,
      totalSteps: job.totalSteps,
    });

    return res.status(201).json(job);
  } catch (error) {
    logger.error('Indexing request failed', {
      profileId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    const message = error instanceof Error ? error.message : 'Internal server error';
    return res.status(500).json({ error: message });
  }
});

/**
 * GET /api/indexing-jobs/:jobId
 * Get status of an indexing job
 */
router.get('/indexing-jobs/:jobId', async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const store = getStore();

    const job = await store.getIndexingJob(jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    return res.json(job);
  } catch (error) {
    console.error('Error in GET /api/indexing-jobs/:jobId:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/profile/:profileId/indexing-jobs
 * List indexing jobs for a profile
 */
router.get('/:profileId/indexing-jobs', async (req: Request, res: Response) => {
  try {
    const { profileId } = req.params;
    const store = getStore();

    const jobs = await store.listIndexingJobs(profileId);
    return res.json({ jobs });
  } catch (error) {
    console.error('Error in GET /api/profile/:profileId/indexing-jobs:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/profile/:profileId/rag/search
 * Search in profile's knowledge base
 */
router.post('/:profileId/rag/search', async (req: Request, res: Response) => {
  const { profileId } = req.params;
  const { query, topK } = req.body;

  try {
    logger.info('RAG search request', {
      profileId,
      query,
      topK,
    });

    if (!query || query.trim().length === 0) {
      logger.warn('RAG search rejected: empty query', { profileId });
      return res.status(400).json({ error: 'query is required' });
    }

    const results = await ragService.searchSimilar(profileId, query, topK);

    logger.info('RAG search completed', {
      profileId,
      query,
      resultCount: results.length,
      topScores: results.slice(0, 3).map(r => r.score),
    });

    return res.json({ results });
  } catch (error) {
    logger.error('RAG search failed', {
      profileId,
      query,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    const message = error instanceof Error ? error.message : 'Internal server error';
    return res.status(500).json({ error: message });
  }
});

/**
 * GET /api/profile/:profileId/rag/debug
 * Debug endpoint to check RAG status and Qdrant collection
 */
router.get('/:profileId/rag/debug', async (req: Request, res: Response) => {
  const { profileId } = req.params;

  try {
    const store = getStore();
    const profile = await store.getProfile(profileId);

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const resources = await store.listResources(profileId);

    // Try to get collection info from Qdrant
    const { QdrantClient } = await import('@qdrant/js-client-rest');
    const qdrantUrl = process.env.QDRANT_URL || 'http://localhost:6333';
    const client = new QdrantClient({ url: qdrantUrl });

    const embeddingModel = profile.embeddingModelId || 'nomic-embed-text';
    const collectionName = `profile_${profileId}_${embeddingModel}`;

    let collectionInfo = null;
    let collectionError = null;
    let samplePoints: any[] = [];

    try {
      collectionInfo = await client.getCollection(collectionName);

      // Get sample points
      const scrollResult = await client.scroll(collectionName, {
        limit: 3,
        with_payload: true,
        with_vector: false,
      });
      samplePoints = scrollResult.points.map(p => ({
        id: p.id,
        content: (p.payload as any)?.content?.substring(0, 200) + '...',
        originalName: (p.payload as any)?.metadata?.originalName,
      }));
    } catch (err: any) {
      collectionError = err.message || String(err);
    }

    return res.json({
      profile: {
        id: profile.id,
        name: profile.name,
        ragEnabled: profile.ragEnabled,
        indexStatus: profile.indexStatus,
        embeddingModelId: profile.embeddingModelId,
        ragSettings: profile.ragSettings,
      },
      resources: resources.map(r => ({
        id: r.id,
        name: r.originalName,
        type: r.type,
        indexed: r.indexed,
        sizeBytes: r.sizeBytes,
      })),
      qdrant: {
        url: qdrantUrl,
        collectionName,
        collectionExists: collectionInfo !== null,
        pointsCount: collectionInfo?.points_count || 0,
        indexedVectorsCount: collectionInfo?.indexed_vectors_count || 0,
        error: collectionError,
        samplePoints,
      },
    });
  } catch (error) {
    logger.error('RAG debug failed', {
      profileId,
      error: error instanceof Error ? error.message : String(error),
    });
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Internal server error' });
  }
});

export default router;
