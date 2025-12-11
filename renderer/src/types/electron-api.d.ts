import type { Joke } from './jokes'

// Chat API types
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
}

export interface ChatSession {
  id: string
  profileId: string
  messages: ChatMessage[]
  createdAt: string
  updatedAt: string
}

export interface SendMessagePayload {
  sessionId?: string
  profileId: string
  message: string
}

export interface SendMessageResponse {
  sessionId: string
  userMessage: ChatMessage
  assistantMessage: ChatMessage
  messages: ChatMessage[]
  ragUsed?: boolean
}

export interface ListSessionsResponse {
  sessions: ChatSession[]
}

// Profile API types
export interface RAGSettings {
  topK: number
  similarityThreshold?: number
}

export interface Profile {
  id: string
  name: string
  description?: string
  system_context: string
  ragEnabled: boolean
  embeddingModelId?: string
  ragSettings: RAGSettings
  indexStatus: 'none' | 'pending' | 'processing' | 'ready' | 'stale' | 'error'
  createdAt: string
}

export interface CreateProfilePayload {
  name: string
  description?: string
  system_context: string
  ragEnabled?: boolean
  embeddingModelId?: string
  ragSettings?: RAGSettings
}

export interface UpdateProfilePayload {
  name?: string
  description?: string
  system_context?: string
  ragEnabled?: boolean
  embeddingModelId?: string
  ragSettings?: RAGSettings
  indexStatus?: 'none' | 'pending' | 'processing' | 'ready' | 'stale' | 'error'
}

export interface ListProfilesResponse {
  profiles: Profile[]
}

// RAG API types
export interface Resource {
  id: string
  profileId: string
  type: 'file' | 'text'
  originalName?: string
  contentPath: string
  mimeType?: string
  sizeBytes?: number
  metadata: Record<string, any>
  indexed: boolean
  createdAt: string
}

export interface ListResourcesResponse {
  resources: Resource[]
}

export interface UploadFilesResponse {
  resources: Resource[]
}

export interface IndexingJob {
  id: string
  profileId: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  totalSteps: number
  processedSteps: number
  progress: number
  error?: string
  createdAt: string
  updatedAt: string
}

export interface ListIndexingJobsResponse {
  jobs: IndexingJob[]
}

export interface RAGSearchResult {
  content: string
  score: number
  metadata: Record<string, any>
}

export interface RAGSearchResponse {
  results: RAGSearchResult[]
}

declare global {
  interface ElectronApi {
    ping: () => Promise<unknown>
    openFileDialog: () => Promise<string[] | undefined>
    notifyJokeAdded: (joke: Joke) => Promise<void> | void
  }

  interface Api {
    chat: {
      sendMessage: (payload: SendMessagePayload) => Promise<SendMessageResponse>
      sendMessageStream: (
        payload: SendMessagePayload,
        onEvent: (event: any) => void,
        abortSignal?: AbortSignal,
      ) => Promise<void>
      getSession: (id: string) => Promise<ChatSession>
      listSessions: (profileId?: string) => Promise<ListSessionsResponse>
    }
    profile: {
      list: () => Promise<ListProfilesResponse>
      create: (data: CreateProfilePayload) => Promise<Profile>
      get: (id: string) => Promise<Profile>
      update: (id: string, data: UpdateProfilePayload) => Promise<Profile>
    }
    rag: {
      uploadFiles: (profileId: string, files: File[]) => Promise<UploadFilesResponse>
      addText: (profileId: string, data: { name?: string; content: string }) => Promise<Resource>
      listResources: (profileId: string) => Promise<ListResourcesResponse>
      deleteResource: (profileId: string, resourceId: string) => Promise<void>
      startIndexing: (profileId: string) => Promise<IndexingJob>
      getIndexingJob: (jobId: string) => Promise<IndexingJob>
      listIndexingJobs: (profileId: string) => Promise<ListIndexingJobsResponse>
      search: (profileId: string, query: string, topK?: number) => Promise<RAGSearchResponse>
    }
  }

  interface Window {
    electronApi: ElectronApi
    api: Api
  }
}

export {}
