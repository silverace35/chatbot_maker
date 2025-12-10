import { Router, Request, Response } from 'express';
import { store } from '../store';
import { llmLocalService, buildMessagesForLLM } from '../services/llmLocal';
import { SendMessagePayload, Message } from '../models/chatSession';
import { ollamaService } from '../services/ollamaService';
import { ragService } from '../services/ragService';

const router = Router();

/**
 * POST /api/chat/send
 * Envoie un message dans une session de chat
 */
router.post('/send', async (req: Request, res: Response) => {
  try {
    const payload: SendMessagePayload = req.body;

    // Validation
    if (!payload.profileId) {
      return res.status(400).json({ error: 'profileId is required' });
    }
    if (!payload.message || payload.message.trim().length === 0) {
      return res.status(400).json({ error: 'message is required' });
    }

    // Vérifier que le profil existe
    const profile = await store.getProfile(payload.profileId);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Récupérer ou créer la session
    let session;
    if (payload.sessionId) {
      session = await store.getSession(payload.sessionId);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }
    } else {
      session = await store.createSession(payload.profileId);
    }

    // Augment message with RAG if enabled and ready
    let augmentedMessage = payload.message.trim();
    let ragUsed = false;

    if (profile.ragEnabled && profile.indexStatus === 'ready') {
      try {
        augmentedMessage = await ragService.augmentPrompt(profile, payload.message.trim());
        ragUsed = true;
      } catch (error) {
        console.error('Error augmenting prompt with RAG:', error);
        // Continue with original message if RAG fails
      }
    }

    // Créer le message user
    const userMessage: Message = {
      role: 'user',
      content: augmentedMessage,
      timestamp: new Date(),
    };

    // Ajouter le message user à la session
    await store.addMessageToSession(session.id, userMessage);

    // Récupérer la session mise à jour (avec tout l'historique)
    const sessionWithUser = await store.getSession(session.id);
    const sessionMessages = sessionWithUser?.messages || [];

    // Appeler le LLM (le service construira le contexte approprié)
    const llmResponse = await llmLocalService.generateCompletion({
      messages: sessionMessages,
      profile,
    });

    // Créer le message assistant
    const assistantMessage: Message = {
      role: 'assistant',
      content: llmResponse.content,
      timestamp: new Date(),
    };

    // Ajouter le message assistant à la session
    await store.addMessageToSession(session.id, assistantMessage);

    // Retourner la réponse
    const updatedSession = await store.getSession(session.id);
    return res.json({
      sessionId: session.id,
      userMessage,
      assistantMessage,
      messages: updatedSession?.messages || [],
      ragUsed,
    });
  } catch (error) {
    console.error('Error in /api/chat/send:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/chat/send-stream
 * Envoie un message dans une session de chat avec streaming
 */
router.post('/send-stream', async (req: Request, res: Response) => {
  try {
    const payload: SendMessagePayload = req.body;

    if (!payload.profileId) {
      return res.status(400).json({ error: 'profileId is required' });
    }
    if (!payload.message || payload.message.trim().length === 0) {
      return res.status(400).json({ error: 'message is required' });
    }

    const profile = await store.getProfile(payload.profileId);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    let session;
    if (payload.sessionId) {
      session = await store.getSession(payload.sessionId);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }
    } else {
      session = await store.createSession(payload.profileId);
    }

    // Augmenter le message avec le RAG comme dans /send
    let augmentedMessage = payload.message.trim();
    let ragUsed = false;

    if (profile.ragEnabled && profile.indexStatus === 'ready') {
      try {
        augmentedMessage = await ragService.augmentPrompt(profile, payload.message.trim());
        ragUsed = true;
      } catch (error) {
        console.error('Error augmenting prompt with RAG (stream):', error);
      }
    }

    const userMessage: Message = {
      role: 'user',
      content: augmentedMessage,
      timestamp: new Date(),
    };

    await store.addMessageToSession(session.id, userMessage);

    const sessionWithUser = await store.getSession(session.id);
    const sessionMessages = sessionWithUser?.messages || [];

    // Construire les messages pour le LLM en tenant compte du profil (system_context, historique...)
    const finalMessages = buildMessagesForLLM(profile, sessionMessages);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    let assistantContent = '';

    (async () => {
      try {
        for await (const chunk of ollamaService.chatStream(finalMessages)) {
          if (chunk.content) {
            assistantContent += chunk.content;
            res.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk.content })}\n\n`);
          }
          if (chunk.done) {
            break;
          }
        }

        const assistantMessage: Message = {
          role: 'assistant',
          content: assistantContent,
          timestamp: new Date(),
        };

        await store.addMessageToSession(session.id, assistantMessage);
        const updatedSession = await store.getSession(session.id);

        res.write(
          `data: ${JSON.stringify({
            type: 'done',
            sessionId: session.id,
            messages: updatedSession?.messages || [],
            ragUsed,
          })}\n\n`,
        );
        res.end();
      } catch (error) {
        console.error('Error in /api/chat/send-stream streaming loop:', error);
        res.write(`data: ${JSON.stringify({ type: 'error', error: 'LLM error' })}\n\n`);
        res.end();
      }
    })();
  } catch (error) {
    console.error('Error in /api/chat/send-stream:', error);
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Internal server error' });
    }
    res.end();
  }
});

/**
 * GET /api/chat/session/:id
 * Récupère l'historique d'une session
 */
router.get('/session/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const session = await store.getSession(id);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    return res.json(session);
  } catch (error) {
    console.error('Error in /api/chat/session/:id:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
