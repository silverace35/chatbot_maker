export interface Resource {
  id: string;
  profileId: string;
  type: 'file' | 'text';
  originalName?: string;
  contentPath: string;
  mimeType?: string;
  sizeBytes?: number;
  metadata: Record<string, any>;
  indexed: boolean;
  createdAt: Date;
}

export interface CreateResourcePayload {
  profileId: string;
  type: 'file' | 'text';
  originalName?: string;
  contentPath: string;
  mimeType?: string;
  sizeBytes?: number;
  metadata?: Record<string, any>;
}

export interface ResourceChunk {
  id: string;
  resourceId: string;
  profileId: string;
  chunkIndex: number;
  content: string;
  metadata: Record<string, any>;
  createdAt: Date;
}

export interface ResourceEmbedding {
  id: string;
  chunkId: string;
  profileId: string;
  embeddingModelId: string;
  vectorId: string;
  createdAt: Date;
}
