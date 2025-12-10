import { Router, Request, Response } from 'express';
import { store } from '../store';
import { CreateProfilePayload, UpdateProfilePayload } from '../models/profile';

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

export default router;
