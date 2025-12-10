export interface IndexingJob {
  id: string;
  profileId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  totalSteps: number;
  processedSteps: number;
  progress: number;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateIndexingJobPayload {
  profileId: string;
  totalSteps?: number;
}

export interface UpdateIndexingJobPayload {
  status?: 'pending' | 'processing' | 'completed' | 'failed';
  processedSteps?: number;
  totalSteps?: number;
  progress?: number;
  error?: string;
}
