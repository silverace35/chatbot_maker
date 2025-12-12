import { Router, Request, Response } from 'express';
import { store } from '../store';
import { CreateProfilePayload, UpdateProfilePayload } from '../models/profile';
import { ragService } from '../services/ragService';
import { fileStorageService } from '../services/fileStorageService';
import { vectorStoreService, getCollectionName } from '../services/vectorStoreService';
import { createLogger } from '../services/logger';

const logger = createLogger('ProfileRoutes');
const router = Router();

/**
 * POST /api/profile
 * Crée un nouveau profil
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const payload: CreateProfilePayload = req.body;

    // Validation
    if (!payload.name || payload.name.trim().length === 0) {
      return res.status(400).json({ error: 'name is required' });
    }
    if (!payload.system_context || payload.system_context.trim().length === 0) {
      return res.status(400).json({ error: 'system_context is required' });
    }

    // Créer le profil
    const profile = await store.createProfile({
      name: payload.name.trim(),
      description: payload.description?.trim(),
      system_context: payload.system_context.trim(),
      ragEnabled: payload.ragEnabled || false,
      embeddingModelId: payload.embeddingModelId,
      ragSettings: payload.ragSettings,
    });

    return res.status(201).json(profile);
  } catch (error) {
    console.error('Error in POST /api/profile:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/profile
 * Liste tous les profils
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const profiles = await store.listProfiles();
    return res.json({ profiles });
  } catch (error) {
    console.error('Error in GET /api/profile:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/profile/:id
 * Récupère un profil spécifique
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const profile = await store.getProfile(id);

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    return res.json(profile);
  } catch (error) {
    console.error('Error in GET /api/profile/:id:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PATCH /api/profile/:id
 * Update a profile
 */
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const payload: UpdateProfilePayload = req.body;

    const profile = await store.updateProfile(id, payload);

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    return res.json(profile);
  } catch (error) {
    console.error('Error in PATCH /api/profile/:id:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/profile/:id
 * Supprime un profil et toutes ses ressources associées
 */
router.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    logger.info('Delete profile request received', { profileId: id });

    // Vérifier que le profil existe
    const profile = await store.getProfile(id);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    logger.info('Deleting profile', {
      profileId: id,
      profileName: profile.name,
      ragEnabled: profile.ragEnabled,
    });

    // 1. Supprimer les ressources et leurs index
    const resources = await store.listResources(id);
    logger.info('Deleting profile resources', {
      profileId: id,
      resourceCount: resources.length,
    });

    for (const resource of resources) {
      try {
        // Supprimer l'index de la ressource
        await ragService.deleteResourceIndex(resource.id);

        // Supprimer le fichier du disque
        try {
          await fileStorageService.deleteFile(resource.contentPath);
        } catch (fileError) {
          logger.warn('Could not delete resource file (may not exist)', {
            profileId: id,
            resourceId: resource.id,
            contentPath: resource.contentPath,
            error: fileError instanceof Error ? fileError.message : String(fileError),
          });
        }

        // Supprimer l'enregistrement de la ressource
        await store.deleteResource(resource.id);
      } catch (resourceError) {
        logger.error('Error deleting resource', {
          profileId: id,
          resourceId: resource.id,
          error: resourceError instanceof Error ? resourceError.message : String(resourceError),
        });
        // Continue avec les autres ressources
      }
    }

    // 2. Supprimer la collection Qdrant si RAG était activé
    if (profile.ragEnabled && profile.embeddingModelId) {
      try {
        const collectionName = getCollectionName(id, profile.embeddingModelId);
        await vectorStoreService.deleteCollection(collectionName);
        logger.info('Deleted Qdrant collection', {
          profileId: id,
          collectionName,
        });
      } catch (qdrantError) {
        logger.warn('Could not delete Qdrant collection (may not exist)', {
          profileId: id,
          error: qdrantError instanceof Error ? qdrantError.message : String(qdrantError),
        });
      }
    }

    // 3. Supprimer les sessions de chat associées
    const sessions = await store.listSessionsByProfile(id);
    logger.info('Deleting profile sessions', {
      profileId: id,
      sessionCount: sessions.length,
    });
    // Note: Les sessions seront supprimées en cascade si la DB le supporte,
    // sinon on les supprime manuellement si nécessaire

    // 4. Supprimer le dossier du profil
    try {
      await fileStorageService.deleteProfileFiles(id);
      logger.info('Deleted profile files directory', { profileId: id });
    } catch (dirError) {
      logger.warn('Could not delete profile directory (may not exist)', {
        profileId: id,
        error: dirError instanceof Error ? dirError.message : String(dirError),
      });
    }

    // 5. Supprimer le profil lui-même
    await store.deleteProfile(id);

    logger.info('Profile deleted successfully', {
      profileId: id,
      profileName: profile.name,
    });

    return res.status(204).send();
  } catch (error) {
    logger.error('Profile deletion failed', {
      profileId: id,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
