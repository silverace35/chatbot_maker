import { Router, Request, Response } from 'express';
import { store } from '../store';
import { llmLocalService, buildMessagesForLLM } from '../services/llmLocal';
import { SendMessagePayload, Message } from '../models/chatSession';
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
  // Générer un ID unique pour cette requête (pour le logging)
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // IMPORTANT: Capturer le timestamp au moment de la réception de la requête
  // Ce timestamp sera utilisé pour le message user ET assistant
  // Cela garantit l'ordre correct même si les générations se terminent dans le désordre
  const requestTimestamp = new Date();

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

    // Préparer le message utilisateur avec le timestamp de la requête
    // IMPORTANT: Sauvegarder le message ORIGINAL, pas le message augmenté RAG
    const userMessage: Message = {
      role: 'user',
      content: payload.message.trim(), // Message original pour l'affichage
      timestamp: requestTimestamp,
    };

    // IMPORTANT: Sauvegarder le message utilisateur IMMÉDIATEMENT
    // Cela garantit que les messages sont dans le bon ordre même avec des requêtes parallèles
    await store.addMessageToSession(session.id, userMessage);
    console.log(`[${requestId}] User message saved to session ${session.id}`);

    // Récupérer la session mise à jour avec le message utilisateur
    const sessionWithUser = await store.getSession(session.id);

    // Pour le LLM, remplacer le dernier message user par la version augmentée
    const messagesForLLM = sessionWithUser?.messages || [];
    if (ragUsed && messagesForLLM.length > 0) {
      // Remplacer le contenu du dernier message (celui qu'on vient d'ajouter) par la version augmentée
      const lastMessage = messagesForLLM[messagesForLLM.length - 1];
      if (lastMessage.role === 'user') {
        lastMessage.content = augmentedMessage;
      }
    }

    const finalMessages = buildMessagesForLLM(profile, messagesForLLM);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    let assistantContent = '';
    let wasAborted = false;

    const controller = new AbortController();
    const signal = controller.signal;

    const abortFromClient = () => {
      if (!signal.aborted) {
        console.log(`[${requestId}] Client disconnected, aborting LLM generation...`);
        wasAborted = true;
        controller.abort(new Error('client-aborted'));
      }
    };

    req.on('close', abortFromClient);
    req.on('aborted', abortFromClient);

    await (async () => {
        try {
            for await (const evt of llmLocalService.generateStreamWithFallback(finalMessages, profile, signal)) {
                // Vérifier l'annulation à chaque itération
                if (signal.aborted || wasAborted) {
                    console.log(`[${requestId}] Signal aborted, breaking stream loop`);
                    break;
                }

                if (evt.type === 'chunk' && evt.content) {
                    assistantContent += evt.content;
                    res.write(`data: ${JSON.stringify({type: 'chunk', content: evt.content})}\n\n`);
                }

                if (evt.type === 'error') {
                    res.write(`data: ${JSON.stringify({type: 'error', error: evt.error || 'LLM error'})}\n\n`);
                    break;
                }

                if (evt.type === 'done') {
                    break;
                }
            }

            // Sauvegarder le message assistant s'il y a du contenu généré
            // Même si la génération a été interrompue, on garde la réponse partielle
            if (assistantContent.trim().length > 0) {
                const wasInterrupted = signal.aborted || wasAborted;

                console.log(`[${requestId}] Saving assistant message (interrupted: ${wasInterrupted}, content length: ${assistantContent.length})`);

                // Le timestamp de l'assistant est 1ms après le user pour garantir l'ordre
                const assistantTimestamp = new Date(requestTimestamp.getTime() + 1);

                const assistantMessage: Message = {
                    role: 'assistant',
                    content: assistantContent,
                    timestamp: assistantTimestamp,
                };

                // Sauvegarder UNIQUEMENT le message assistant (le user est déjà sauvegardé)
                await store.addMessageToSession(session.id, assistantMessage);

                const updatedSession = await store.getSession(session.id);

                // Envoyer l'événement approprié
                if (wasInterrupted) {
                    // Envoyer un événement spécial pour indiquer que c'est une réponse partielle
                    try {
                        res.write(
                            `data: ${JSON.stringify({
                                type: 'aborted',
                                sessionId: session.id,
                                messages: updatedSession?.messages || [],
                                ragUsed,
                                partial: true,
                            })}\n\n`,
                        );
                    } catch {
                    }
                } else {
                    res.write(
                        `data: ${JSON.stringify({
                            type: 'done',
                            sessionId: session.id,
                            messages: updatedSession?.messages || [],
                            ragUsed,
                        })}\n\n`,
                    );
                }
            } else if (signal.aborted || wasAborted) {
                // Annulé avant d'avoir généré du contenu - ne rien sauvegarder
                console.log(`[${requestId}] Stream was aborted with no content, not saving`);
                try {
                    res.write(`data: ${JSON.stringify({type: 'aborted', partial: false})}\n\n`);
                } catch {
                }
            }

            try {
                res.end();
            } catch (_) {
            }
        } catch (error) {
            if (signal.aborted || wasAborted) {
                // Même en cas d'erreur après abort, sauvegarder le contenu partiel
                if (assistantContent.trim().length > 0) {
                    console.log(`[${requestId}] Error after abort, but saving partial assistant content`);
                    const assistantTimestamp = new Date(requestTimestamp.getTime() + 1);
                    const assistantMessage: Message = {
                        role: 'assistant',
                        content: assistantContent,
                        timestamp: assistantTimestamp,
                    };
                    // Le message user est déjà sauvegardé, on ajoute seulement l'assistant
                    await store.addMessageToSession(session.id, assistantMessage);

                    const updatedSession = await store.getSession(session.id);
                    try {
                        res.write(
                            `data: ${JSON.stringify({
                                type: 'aborted',
                                sessionId: session.id,
                                messages: updatedSession?.messages || [],
                                partial: true,
                            })}\n\n`,
                        );
                    } catch {
                    }
                }
                try {
                    res.end();
                } catch (_) {
                }
                return;
            }

            console.error(`[${requestId}] Error in streaming loop:`, error);
            try {
                res.write(`data: ${JSON.stringify({type: 'error', error: 'LLM error'})}\n\n`);
                res.end();
            } catch (_) {
            }
        } finally {
            req.off('close', abortFromClient);
            req.off('aborted', abortFromClient);
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

/**
 * GET /api/chat/sessions
 * Liste toutes les sessions de chat
 */
router.get('/sessions', async (req: Request, res: Response) => {
  try {
    const { profileId } = req.query;
    
    let sessions;
    if (profileId && typeof profileId === 'string') {
      sessions = await store.listSessionsByProfile(profileId);
    } else {
      sessions = await store.listSessions();
    }

    return res.json({ sessions });
  } catch (error) {
    console.error('Error in /api/chat/sessions:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
