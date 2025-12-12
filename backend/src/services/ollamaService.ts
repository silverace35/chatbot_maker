import { Message } from '../models/chatSession';

export interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  system?: string;
  stream?: boolean;
  options?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
  };
}

export interface OllamaChatRequest {
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  stream?: boolean;
  keep_alive?: number | string; // -1 pour garder en mémoire indéfiniment, ou durée comme "5m"
  options?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
  };
}

export interface OllamaModel {
  name: string;
  modified_at?: string;
  size?: number;
}

export interface OllamaModelsResponse {
  models: OllamaModel[];
}

export interface OllamaResponse {
  model: string;
  created_at: string;
  message?: {
    role: string;
    content: string;
  };
  response?: string;
  done: boolean;
}

export interface OllamaStreamChunk {
  content: string;
  done: boolean;
}

export interface OllamaEmbeddingRequest {
  model: string;
  prompt: string;
}

export interface OllamaEmbeddingResponse {
  embedding: number[];
}

/**
 * Service d'intégration avec Ollama
 * 
 * Ce service communique avec l'API Ollama pour générer des réponses LLM réelles.
 * Il supporte plusieurs modèles et gère les erreurs de connexion.
 */
export class OllamaService {
  private baseUrl: string;
  private defaultModel: string;
  private timeout: number;
  private isWarmedUp: boolean = false;
  private warmupInProgress: boolean = false;

  constructor(
    baseUrl: string = process.env.OLLAMA_URL || 'http://localhost:11434',
    defaultModel: string = process.env.OLLAMA_DEFAULT_MODEL || 'llama3.1:8b',
    timeout: number = parseInt(process.env.OLLAMA_TIMEOUT_MS || '600000', 10),
  ) {
    this.baseUrl = baseUrl;
    this.defaultModel = defaultModel;
    this.timeout = timeout;

    console.log('[OllamaService] Base URL =', this.baseUrl);
    console.log('[OllamaService] Default model =', this.defaultModel);
    console.log('[OllamaService] Timeout (ms) =', this.timeout);
  }

  /**
   * Précharge le modèle en mémoire GPU pour éviter le cold start
   * Envoie une requête minimale pour forcer Ollama à charger le modèle
   */
  async warmup(model?: string): Promise<boolean> {
    if (this.isWarmedUp || this.warmupInProgress) {
      return this.isWarmedUp;
    }

    this.warmupInProgress = true;
    const selectedModel = model || this.defaultModel;

    console.log(`[OllamaService] 🔥 Warming up model "${selectedModel}"...`);
    const startTime = Date.now();

    try {
      // Vérifier d'abord que le modèle est disponible
      const models = await this.listModels();
      if (!models.includes(selectedModel)) {
        console.warn(`[OllamaService] ⚠️ Model "${selectedModel}" not found. Available: ${models.join(', ')}`);
        this.warmupInProgress = false;
        return false;
      }

      // Envoyer une requête minimale pour forcer le chargement du modèle
      // keep_alive: -1 maintient le modèle en mémoire indéfiniment
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: selectedModel,
          prompt: 'Hi',
          stream: false,
          options: {
            num_predict: 1, // Générer seulement 1 token pour être rapide
          },
          keep_alive: -1, // Garder le modèle chargé indéfiniment
        }),
      });

      if (response.ok) {
        const duration = Date.now() - startTime;
        console.log(`[OllamaService] ✅ Model "${selectedModel}" warmed up in ${duration}ms`);
        this.isWarmedUp = true;
        this.warmupInProgress = false;
        return true;
      } else {
        console.warn(`[OllamaService] ⚠️ Warmup failed: ${response.statusText}`);
        this.warmupInProgress = false;
        return false;
      }
    } catch (error) {
      console.error('[OllamaService] ❌ Warmup error:', error instanceof Error ? error.message : error);
      this.warmupInProgress = false;
      return false;
    }
  }

  /**
   * Vérifie si le modèle est préchargé
   */
  isModelWarmedUp(): boolean {
    return this.isWarmedUp;
  }

  /**
   * Vérifie si Ollama est disponible
   */
  async isAvailable(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 secondes timeout

      const response = await fetch(`${this.baseUrl}/api/tags`, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      console.warn('Ollama not available:', error instanceof Error ? error.message : 'Unknown error');
      return false;
    }
  }

  /**
   * Liste les modèles disponibles dans Ollama
   */
  async listModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      if (!response.ok) {
        throw new Error(`Failed to list models: ${response.statusText}`);
      }

      const data = await response.json() as OllamaModelsResponse;
      return data.models?.map((m) => m.name) || [];
    } catch (error) {
      console.error('Error listing Ollama models:', error);
      return [];
    }
  }

  private async ensureModelAvailable(model: string): Promise<void> {
    const models = await this.listModels();
    if (!models.includes(model)) {
      const hint = models.length
        ? `Modèles disponibles: ${models.join(', ')}`
        : 'Aucun modèle n’est actuellement disponible dans Ollama. Pense à lancer "ollama pull" ou à télécharger le modèle via l’interface Ollama.';
      throw new Error(
        `Le modèle Ollama "${model}" n'est pas disponible. ${hint}`,
      );
    }
  }

  /**
   * Génère une réponse avec Ollama en utilisant l'API chat
   * 
   * @param messages Historique des messages (system, user, assistant)
   * @param model Modèle à utiliser (optionnel, utilise le modèle par défaut sinon)
   * @param temperature Température pour la génération (0-1)
   * @returns Contenu de la réponse générée
   */
  async chat(
    messages: Message[],
    model?: string,
    temperature: number = 0.7,
  ): Promise<string> {
    const selectedModel = model || this.defaultModel;
    await this.ensureModelAvailable(selectedModel);

    // Convertir les messages au format Ollama
    const ollamaMessages = messages.map(msg => ({
      role: msg.role as 'system' | 'user' | 'assistant',
      content: msg.content,
    }));

    const request: OllamaChatRequest = {
      model: selectedModel,
      messages: ollamaMessages,
      stream: false,
      keep_alive: -1, // Garder le modèle chargé en mémoire GPU indéfiniment
      options: {
        temperature,
      },
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }

      const data = await response.json() as OllamaResponse;
      
      if (!data.message?.content) {
        throw new Error('No content in Ollama response');
      }

      return data.message.content;
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Ollama request timeout');
        }
        throw new Error(`Ollama chat error: ${error.message}`);
      }
      throw new Error('Unknown Ollama error');
    }
  }

  /**
   * Génère une réponse simple avec un prompt (API generate)
   * Utilisé principalement pour des tests simples
   */
  async generate(
    prompt: string,
    systemContext?: string,
    model?: string,
    temperature: number = 0.7,
  ): Promise<string> {
    const selectedModel = model || this.defaultModel;
    await this.ensureModelAvailable(selectedModel);

    const request: OllamaGenerateRequest = {
      model: selectedModel,
      prompt,
      system: systemContext,
      stream: false,
      options: {
        temperature,
      },
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }

      const data = await response.json() as OllamaResponse;
      
      if (!data.response) {
        throw new Error('No response in Ollama generate response');
      }

      return data.response;
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Ollama request timeout');
        }
        throw new Error(`Ollama generate error: ${error.message}`);
      }
      throw new Error('Unknown Ollama error');
    }
  }

  /**
   * Télécharge un modèle depuis Ollama Hub
   * Note: Cette opération peut prendre plusieurs minutes
   */
  async pullModel(modelName: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/pull`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: modelName }),
      });

      if (!response.ok) {
        throw new Error(`Failed to pull model: ${response.statusText}`);
      }

      // Note: Le streaming de progression n'est pas géré ici
      // En production, on pourrait streamer le statut du téléchargement
      console.log(`Model ${modelName} pull initiated`);
    } catch (error) {
      console.error('Error pulling Ollama model:', error);
      throw error;
    }
  }

  /**
   * Génère un embedding pour un texte donné
   * 
   * @param text Texte à transformer en embedding
   * @param model Modèle d'embedding à utiliser (par défaut: nomic-embed-text)
   * @returns Le vecteur d'embedding
   */
  async generateEmbedding(
    text: string,
    model: string = 'nomic-embed-text'
  ): Promise<number[]> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 secondes timeout

      const request: OllamaEmbeddingRequest = {
        model,
        prompt: text,
      };

      const response = await fetch(`${this.baseUrl}/api/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Ollama embeddings API error: ${response.statusText}`);
      }

      const data = await response.json() as OllamaEmbeddingResponse;

      if (!data.embedding || !Array.isArray(data.embedding)) {
        throw new Error('Invalid embedding response from Ollama');
      }

      return data.embedding;
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Ollama embedding request timeout');
        }
        throw new Error(`Ollama embedding error: ${error.message}`);
      }
      throw new Error('Unknown Ollama embedding error');
    }
  }

  /**
   * Génère des embeddings pour plusieurs textes (batch)
   * 
   * @param texts Tableau de textes à transformer en embeddings
   * @param model Modèle d'embedding à utiliser (par défaut: nomic-embed-text)
   * @returns Tableau de vecteurs d'embeddings
   */
  async generateEmbeddings(
    texts: string[],
    model: string = 'nomic-embed-text'
  ): Promise<number[][]> {
    // Ollama doesn't support batch embedding natively, so we process sequentially
    // In production, consider implementing parallel processing with rate limiting
    const embeddings: number[][] = [];
    
    for (const text of texts) {
      const embedding = await this.generateEmbedding(text, model);
      embeddings.push(embedding);
    }

    return embeddings;
  }

  /**
   * Génère une réponse avec Ollama en utilisant l'API chat en mode streaming
   *
   * @param messages Historique des messages (system, user, assistant)
   * @param options Options de streaming (modèle, température, signal d'annulation)
   * @returns Un itérateur asynchrone de chunks de texte
   */
  async *chatStream(
    messages: Message[],
    options?: { model?: string; temperature?: number; signal?: AbortSignal },
  ): AsyncGenerator<OllamaStreamChunk, void, unknown> {
    const selectedModel = options?.model || this.defaultModel;
    await this.ensureModelAvailable(selectedModel);

    const ollamaMessages = messages.map(msg => ({
      role: msg.role as 'system' | 'user' | 'assistant',
      content: msg.content,
    }));

    const request: OllamaChatRequest = {
      model: selectedModel,
      messages: ollamaMessages,
      stream: true,
      keep_alive: -1, // Garder le modèle chargé en mémoire GPU indéfiniment
      options: {
        temperature: options?.temperature ?? 0.7,
      },
    };

    const controller = new AbortController();
    const externalSignal = options?.signal;

    const onAbort = () => {
      if (!controller.signal.aborted) {
        controller.abort();
      }
    };

    if (externalSignal) {
      if (externalSignal.aborted) {
        controller.abort();
      } else if (typeof externalSignal.addEventListener === 'function') {
        externalSignal.addEventListener('abort', onAbort, { once: true });
      }
    }

    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok || !response.body) {
        throw new Error(`Ollama API error (stream): ${response.statusText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      try {
        while (true) {
          // Vérifier l'annulation AVANT de lire
          if (externalSignal?.aborted || controller.signal.aborted) {
            console.log('[OllamaService] Stream aborted by client, cancelling reader...');
            await reader.cancel('Client aborted');
            return;
          }

          const { value, done } = await reader.read();
          if (done) {
            break;
          }

          // Vérifier l'annulation APRÈS la lecture aussi
          if (externalSignal?.aborted || controller.signal.aborted) {
            console.log('[OllamaService] Stream aborted by client after read, cancelling...');
            await reader.cancel('Client aborted');
            return;
          }

          const text = decoder.decode(value, { stream: true });
          const lines = text.split(/\n/).filter(Boolean);

          for (const line of lines) {
            try {
              const data = JSON.parse(line) as OllamaResponse;
              const contentPart = data.message?.content || data.response || '';
              const doneFlag = data.done;

              if (contentPart) {
                yield { content: contentPart, done: !!doneFlag };
              }

              if (doneFlag) {
                return;
              }
            } catch {
              // Ligne invalide, on l'ignore simplement
              continue;
            }
          }
        }
      } finally {
        // S'assurer que le reader est annulé si le signal a été aborté
        if (externalSignal?.aborted || controller.signal.aborted) {
          try {
            await reader.cancel('Cleanup after abort');
          } catch {
            // Ignorer les erreurs de cancel
          }
        }
        reader.releaseLock();
      }
    } catch (error) {
      if ((error as any).name === 'AbortError' || externalSignal?.aborted) {
        console.log('[OllamaService] Stream aborted or timed out');
        // Annulation ou timeout : on arrête silencieusement le stream
        return;
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
      if (externalSignal && typeof externalSignal.removeEventListener === 'function') {
        externalSignal.removeEventListener('abort', onAbort as any);
      }
    }
  }
}

export const ollamaService = new OllamaService();
