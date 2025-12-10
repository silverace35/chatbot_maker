export interface RAGSettings {
  topK: number;
  similarityThreshold?: number;
}

export interface Profile {
  id: string;
  name: string;
  description?: string;
  system_context: string;
  ragEnabled: boolean;
  embeddingModelId?: string;
  ragSettings: RAGSettings;
  indexStatus: 'none' | 'pending' | 'processing' | 'ready' | 'stale' | 'error';
  createdAt: Date;
}

export interface CreateProfilePayload {
  name: string;
  description?: string;
  system_context: string;
  ragEnabled?: boolean;
  embeddingModelId?: string;
  ragSettings?: RAGSettings;
}

export interface UpdateProfilePayload {
  name?: string;
  description?: string;
  system_context?: string;
  ragEnabled?: boolean;
  embeddingModelId?: string;
  ragSettings?: RAGSettings;
  indexStatus?: 'none' | 'pending' | 'processing' | 'ready' | 'stale' | 'error';
}
