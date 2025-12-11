import { Message } from '../models/chatSession';
import { Profile } from '../models/profile';
import { ollamaService } from './ollamaService';

export interface LLMCompletionRequest {
  messages: Message[];
  profile?: Profile;
  temperature?: number;
  model?: string;
}

export interface LLMCompletionResponse {
  content: string;
  model?: string;
  source: 'ollama' | 'stub';
}

/**
 * Service LLM Local
 * 
 * Intègre Ollama comme LLM principal avec fallback sur un stub en cas d'indisponibilité.
 * La variable d'environnement OLLAMA_ENABLED permet de forcer l'utilisation du stub.
 */
export class LLMLocalService {
  private ollamaAvailable: boolean = false;
  private ollamaCheckInProgress: boolean = false;
  private lastCheck: number = 0;
  private checkInterval: number = 30000; // Vérifier toutes les 30 secondes

  constructor() {
    // Vérifier la disponibilité d'Ollama au démarrage (sans bloquer)
    this.checkOllamaAvailability();
  }

  /**
   * Vérifie si Ollama est disponible (avec cache pour éviter trop de requêtes)
   */
  private async checkOllamaAvailability(): Promise<void> {
    // Ne pas vérifier trop souvent
    const now = Date.now();
    if (this.ollamaCheckInProgress || (now - this.lastCheck) < this.checkInterval) {
      return;
    }

    this.ollamaCheckInProgress = true;
    this.lastCheck = now;

    try {
      const isOllamaEnabled = process.env.OLLAMA_ENABLED !== 'false';
      if (!isOllamaEnabled) {
        this.ollamaAvailable = false;
        console.log('Ollama is disabled via OLLAMA_ENABLED env variable');
        return;
      }

      this.ollamaAvailable = await ollamaService.isAvailable();
      
      if (this.ollamaAvailable) {
        console.log('✅ Ollama is available and will be used for LLM requests');
        
        // Lister les modèles disponibles
        const models = await ollamaService.listModels();
        if (models.length > 0) {
          console.log(`Available Ollama models: ${models.join(', ')}`);
        } else {
          console.warn('⚠️  Ollama is running but no models are installed. Use: docker exec -it electron-chat-ollama ollama pull llama2');
        }
      } else {
        console.log('⚠️  Ollama not available, using stub LLM');
      }
    } catch (error) {
      this.ollamaAvailable = false;
      console.warn('Error checking Ollama availability:', error);
    } finally {
      this.ollamaCheckInProgress = false;
    }
  }

  /**
   * Génère une réponse à partir d'un historique de messages
   * 
   * Essaie d'utiliser Ollama en priorité, avec fallback sur le stub si:
   * - Ollama n'est pas disponible
   * - OLLAMA_ENABLED=false
   * - Une erreur se produit
   * 
   * @param request Configuration de la requête (messages, profil, température, modèle)
   * @returns Réponse générée par le LLM
   */
  async generateCompletion(request: LLMCompletionRequest): Promise<LLMCompletionResponse> {
    const { messages, profile, temperature = 0.7, model } = request;

    // Vérifier périodiquement la disponibilité d'Ollama
    await this.checkOllamaAvailability();

    const finalMessages =
      profile && messages.length > 0 ? buildMessagesForLLM(profile, messages) : messages;

    // Essayer d'utiliser Ollama si disponible
    if (this.ollamaAvailable) {
      try {
        const content = await ollamaService.chat(
          finalMessages,
          model || process.env.OLLAMA_DEFAULT_MODEL,
          temperature,
        );

        return {
          content,
          model: model || process.env.OLLAMA_DEFAULT_MODEL || 'llama2',
          source: 'ollama',
        };
      } catch (error) {
        console.error('Error using Ollama, falling back to stub:', error);
        this.ollamaAvailable = false;
        this.lastCheck = 0;
      }
    }

    // Fallback: utiliser le stub
    return this.generateStubResponse(finalMessages, profile);
  }

  /**
   * Génère une réponse stub (mode dégradé)
   */
  private async generateStubResponse(
    messages: Message[],
    profile?: Profile,
  ): Promise<LLMCompletionResponse> {
    const lastUserMessage = messages.filter((m) => m.role === 'user').pop();
    const userContent = lastUserMessage?.content || 'Bonjour';

    await this.delay(300);

    let responsePrefix = '';

    if (profile) {
      responsePrefix = `[STUB - LLM via profil "${profile.name}"] `;
    } else {
      responsePrefix = '[STUB - LLM sans profil] ';
    }

    const responseBody =
      "J'ai bien reçu votre message. Ceci est une réponse stub (Ollama indisponible).";

    return {
      content: `${responsePrefix}${responseBody} Message original: "${userContent}"`,
      model: 'stub-v1',
      source: 'stub',
    };
  }

  /**
   * Retourne le statut de disponibilité d'Ollama
   */
  async getStatus(): Promise<{
    ollamaAvailable: boolean;
    models: string[];
  }> {
    await this.checkOllamaAvailability();
    
    let models: string[] = [];
    if (this.ollamaAvailable) {
      models = await ollamaService.listModels();
    }

    return {
      ollamaAvailable: this.ollamaAvailable,
      models,
    };
  }

  /**
   * Streaming avec fallback :
   * - essaie de streamer via Ollama si disponible
   * - en cas d'erreur avant le premier chunk, bascule sur une réponse stub complète
   * - en cas d'annulation (signal.aborted), s'arrête silencieusement
   */
  async *generateStreamWithFallback(
    messages: Message[],
    profile: Profile,
    signal?: AbortSignal,
  ): AsyncGenerator<{ type: 'chunk' | 'done' | 'error'; content?: string; error?: string }, void, unknown> {
    // Vérifier la dispo d'Ollama, mais ne jamais bloquer l'appelant très longtemps
    await this.checkOllamaAvailability();

    const finalMessages = buildMessagesForLLM(profile, messages);

    // Essayer Ollama si marqué disponible
    if (this.ollamaAvailable) {
      let anyChunkSent = false;
      try {
        for await (const chunk of ollamaService.chatStream(finalMessages, { signal })) {
          if (signal?.aborted) {
            // Arrêt silencieux côté client
            return;
          }

          if (chunk.content) {
            anyChunkSent = true;
            yield { type: 'chunk', content: chunk.content };
          }

          if (chunk.done) {
            yield { type: 'done' };
            return;
          }
        }

        // Si Ollama termine sans flag done mais qu'on a déjà envoyé des chunks
        if (anyChunkSent) {
          yield { type: 'done' };
          return;
        }
      } catch (error) {
        console.error('Error during Ollama streaming, will fallback to stub if possible:', error);
        this.ollamaAvailable = false;
        this.lastCheck = 0;

        if (signal?.aborted) {
          // Si l'appelant a annulé, on ne tente pas de stub
          return;
        }

        // Si aucune donnée n'a été envoyée, on peut encore basculer sur stub
        if (!anyChunkSent) {
          const stub = await this.generateStubResponse(finalMessages, profile);
          if (signal?.aborted) return;
          yield { type: 'chunk', content: stub.content };
          yield { type: 'done' };
          return;
        }

        // Si des chunks ont déjà été envoyés, remonter une erreur explicite
        yield {
          type: 'error',
          error: "Erreur lors du streaming LLM. Une partie de la réponse a pu être envoyée.",
        };
        return;
      }
    }

    // Fallback direct stub si Ollama n'est pas disponible
    if (signal?.aborted) return;
    const stub = await this.generateStubResponse(messages, profile);
    if (signal?.aborted) return;
    yield { type: 'chunk', content: stub.content };
    yield { type: 'done' };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Configuration de la fenêtre de contexte
const MAX_HISTORY_MESSAGES = parseInt(process.env.LLM_MAX_HISTORY || '20', 10);

/**
 * Construit les messages à envoyer au LLM à partir du profil et de l'historique.
 * - Ajoute un message system enrichi avec le system_context du profil et des règles globales.
 * - Applique une fenêtre de contexte sur l'historique.
 * - Garde le dernier message user en fin de liste.
 */
export function buildMessagesForLLM(
  profile: Profile,
  sessionMessages: Message[],
): Message[] {
  if (!sessionMessages.length) {
    return [];
  }

  // Dernier message user (pour la langue, etc.)
  const lastUser = [...sessionMessages].reverse().find((m) => m.role === 'user');
  const lastUserContent = lastUser?.content ?? '';

  // Instruction de langue : répondre dans la langue du dernier message utilisateur
  const languageInstruction =
    "Réponds dans la même langue que celle utilisée par l'utilisateur dans son dernier message, " +
    "sauf s'il te demande explicitement d'utiliser une autre langue. Si tu n'es pas certain de la langue, " +
    "réponds en français. N'annonce pas cette logique dans ta réponse, applique-la simplement.";

  // Règles globales de style et de comportement
  const globalStyleInstruction = [
    "Tu es un assistant utile et honnête.",
    "Fournis des réponses claires, structurées et concises.",
    "Quand c'est utile, explique brièvement ton raisonnement.",
    "Si la question est ambiguë, demande une précision plutôt que d'inventer.",
    "Quand la réponse est un peu longue ou comporte plusieurs parties (explications, étapes, options, exemples, code, etc.), utilise le format Markdown pour la structurer : titres (##), listes à puces, blocs de code ```lang``` quand tu montres du code, tableaux si nécessaire.",
    "N'indique pas que tu utilises du Markdown, applique-le simplement pour améliorer la lisibilité.",
  ].join('\n');

  const systemContent = [
    `Contexte du profil: ${profile.system_context}`,
    '',
    languageInstruction,
    '',
    globalStyleInstruction,
  ].join('\n');

  const systemMessage: Message = {
    role: 'system',
    content: systemContent,
    timestamp: new Date(),
  };

  // Fenêtre d'historique : on garde les N derniers messages de la session
  const history = sessionMessages.slice(-MAX_HISTORY_MESSAGES);

  return [systemMessage, ...history];
}

// Singleton instance
export const llmLocalService = new LLMLocalService();
