import type { ChatMessage } from '@/types/electron-api'

export type {
  ChatMessage,
  ChatSession,
  SendMessagePayload,
  SendMessageResponse,
} from '@/types/electron-api'

export interface ChatStreamEvent {
  type: 'chunk' | 'done' | 'error' | 'aborted'
  content?: string
  sessionId?: string
  messages?: ChatMessage[]
  error?: string
  partial?: boolean  // true si la réponse a été interrompue mais sauvegardée
  ragUsed?: boolean
}

export type ChatStreamCallback = (event: ChatStreamEvent) => void
