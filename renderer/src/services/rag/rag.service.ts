import type {
  Resource,
  ListResourcesResponse,
  UploadFilesResponse,
  IndexingJob,
  ListIndexingJobsResponse,
  RAGSearchResponse,
} from '../../types/electron-api';

/**
 * RAG Service
 * Handles resource management, indexing, and search operations
 */
class RAGService {
  /**
   * Upload files for a profile
   */
  async uploadFiles(profileId: string, files: File[]): Promise<Resource[]> {
    try {
      const response: UploadFilesResponse = await window.api.rag.uploadFiles(profileId, files);
      return response.resources;
    } catch (error) {
      console.error('Error uploading files:', error);
      throw error;
    }
  }

  /**
   * Add text content as a resource
   */
  async addText(profileId: string, name: string, content: string): Promise<Resource> {
    try {
      return await window.api.rag.addText(profileId, { name, content });
    } catch (error) {
      console.error('Error adding text:', error);
      throw error;
    }
  }

  /**
   * List resources for a profile
   */
  async listResources(profileId: string): Promise<Resource[]> {
    try {
      const response: ListResourcesResponse = await window.api.rag.listResources(profileId);
      return response.resources;
    } catch (error) {
      console.error('Error listing resources:', error);
      throw error;
    }
  }

  /**
   * Delete a resource
   */
  async deleteResource(profileId: string, resourceId: string): Promise<void> {
    try {
      await window.api.rag.deleteResource(profileId, resourceId);
    } catch (error) {
      console.error('Error deleting resource:', error);
      throw error;
    }
  }

  /**
   * Start indexing for a profile
   */
  async startIndexing(profileId: string): Promise<IndexingJob> {
    try {
      return await window.api.rag.startIndexing(profileId);
    } catch (error) {
      console.error('Error starting indexing:', error);
      throw error;
    }
  }

  /**
   * Get indexing job status
   */
  async getIndexingJob(jobId: string): Promise<IndexingJob> {
    try {
      return await window.api.rag.getIndexingJob(jobId);
    } catch (error) {
      console.error('Error getting indexing job:', error);
      throw error;
    }
  }

  /**
   * List indexing jobs for a profile
   */
  async listIndexingJobs(profileId: string): Promise<IndexingJob[]> {
    try {
      const response: ListIndexingJobsResponse = await window.api.rag.listIndexingJobs(profileId);
      return response.jobs;
    } catch (error) {
      console.error('Error listing indexing jobs:', error);
      throw error;
    }
  }

  /**
   * Search in profile's knowledge base
   */
  async search(profileId: string, query: string, topK?: number): Promise<RAGSearchResponse> {
    try {
      return await window.api.rag.search(profileId, query, topK);
    } catch (error) {
      console.error('Error searching:', error);
      throw error;
    }
  }
}

export const ragService = new RAGService();
