import type { ChatMessage } from '@/types/electron-api'

export type {
  ChatMessage,
  ChatSession,
  SendMessagePayload,
  SendMessageResponse,
} from '@/types/electron-api'

export interface ChatStreamEvent {
  type: 'chunk' | 'done' | 'error'
  content?: string
  sessionId?: string
  messages?: ChatMessage[]
  error?: string
}

export type ChatStreamCallback = (event: ChatStreamEvent) => void
