import type {
  SendMessagePayload,
  SendMessageResponse,
  ChatSession,
  ChatStreamCallback,
} from './chat.service.types'

export interface ChatStreamHandle {
  stop: () => void
}

/**
 * Service pour gérer les conversations de chat
 * Wrapper autour de window.api.chat
 */
export const chatService = {
  /**
   * Envoie un message dans une session de chat
   * @param payload - Données du message (sessionId optionnel, profileId, message)
   * @returns Réponse contenant le message user, la réponse assistant, et l'historique
   */
  async sendMessage(payload: SendMessagePayload): Promise<SendMessageResponse> {
    if (!window.api?.chat?.sendMessage) {
      throw new Error('Chat API not available')
    }
    return window.api.chat.sendMessage(payload)
  },

  /**
   * Récupère l'historique d'une session de chat
   * @param sessionId - ID de la session
   * @returns Session complète avec tous les messages
   */
  async getSession(sessionId: string): Promise<ChatSession> {
    if (!window.api?.chat?.getSession) {
      throw new Error('Chat API not available')
    }
    return window.api.chat.getSession(sessionId)
  },

  /**
   * Liste toutes les sessions de chat ou les sessions d'un profil spécifique
   * @param profileId - ID du profil (optionnel)
   * @returns Liste des sessions
   */
  async listSessions(profileId?: string): Promise<ChatSession[]> {
    if (!window.api?.chat?.listSessions) {
      throw new Error('Chat API not available')
    }
    const response = await window.api.chat.listSessions(profileId)
    return response.sessions
  },

  /**
   * Envoie un message avec streaming de la réponse
   * @param payload - Données du message
   * @param onEvent - Callback appelé pour chaque événement de stream
   */
  sendMessageStream(
    payload: SendMessagePayload,
    onEvent: ChatStreamCallback,
  ): ChatStreamHandle {
    if (!window.api?.chat?.sendMessageStream) {
      throw new Error('Chat streaming API not available')
    }

    const controller = new AbortController()

    window.api.chat.sendMessageStream(payload, onEvent, controller.signal).catch((error) => {
      console.error('Chat streaming error:', error)
      onEvent({ type: 'error', error: error.message || 'Streaming error' })
    })

    return {
      stop: () => {
        controller.abort()
      },
    }
  },
}
