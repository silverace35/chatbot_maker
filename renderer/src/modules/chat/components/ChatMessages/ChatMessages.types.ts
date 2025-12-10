import type { ChatMessage } from '@/services/chat/chat.service.types'

export interface ChatMessagesProps {
  messages: ChatMessage[]
  isLoading?: boolean
  assistantName?: string
}
