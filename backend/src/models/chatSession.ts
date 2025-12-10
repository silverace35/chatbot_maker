export type MessageRole = 'user' | 'assistant' | 'system';

export interface Message {
  role: MessageRole;
  content: string;
  timestamp: Date;
}

export interface ChatSession {
  id: string;
  profileId: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

export interface SendMessagePayload {
  sessionId?: string;
  profileId: string;
  message: string;
}

export interface SendMessageResponse {
  sessionId: string;
  userMessage: Message;
  assistantMessage: Message;
  messages: Message[];
}
