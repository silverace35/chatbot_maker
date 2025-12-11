import { Profile, CreateProfilePayload, UpdateProfilePayload } from '../models/profile';
import { ChatSession, Message } from '../models/chatSession';
import { Resource, CreateResourcePayload, ResourceChunk, ResourceEmbedding } from '../models/resource';
import { IndexingJob, CreateIndexingJobPayload, UpdateIndexingJobPayload } from '../models/indexingJob';

/**
 * Interface commune pour tous les stores (memory, postgres, etc.)
 * Garantit que tous les stores exposent les mêmes méthodes
 */
export interface IStore {
  // Profile methods
  createProfile(payload: CreateProfilePayload): Promise<Profile>;
  getProfile(id: string): Promise<Profile | undefined>;
  listProfiles(): Promise<Profile[]>;
  updateProfile(id: string, payload: UpdateProfilePayload): Promise<Profile | undefined>;

  // Session methods
  createSession(profileId: string): Promise<ChatSession>;
  getSession(id: string): Promise<ChatSession | undefined>;
  listSessions(): Promise<ChatSession[]>;
  listSessionsByProfile(profileId: string): Promise<ChatSession[]>;
  updateSession(id: string, messages: Message[]): Promise<ChatSession | undefined>;
  addMessageToSession(sessionId: string, message: Message): Promise<ChatSession | undefined>;

  // Resource methods
  createResource(payload: CreateResourcePayload): Promise<Resource>;
  getResource(id: string): Promise<Resource | undefined>;
  listResources(profileId: string): Promise<Resource[]>;
  updateResource(id: string, payload: Partial<Resource>): Promise<Resource | undefined>;
  deleteResource(id: string): Promise<void>;

  // Indexing job methods
  createIndexingJob(payload: CreateIndexingJobPayload): Promise<IndexingJob>;
  getIndexingJob(id: string): Promise<IndexingJob | undefined>;
  listIndexingJobs(profileId: string): Promise<IndexingJob[]>;
  updateIndexingJob(id: string, payload: UpdateIndexingJobPayload): Promise<IndexingJob | undefined>;

  // Resource chunk methods
  createResourceChunk(payload: {
    resourceId: string;
    profileId: string;
    chunkIndex: number;
    content: string;
    metadata: Record<string, any>;
  }): Promise<string>;
  getResourceChunk(id: string): Promise<ResourceChunk | undefined>;
  listResourceChunks(resourceId: string): Promise<ResourceChunk[]>;
  deleteResourceChunk(id: string): Promise<void>;

  // Resource embedding methods
  createResourceEmbedding(payload: {
    chunkId: string;
    profileId: string;
    embeddingModelId: string;
    vectorId: string;
  }): Promise<string>;
  getResourceEmbedding(id: string): Promise<ResourceEmbedding | undefined>;
  listResourceEmbeddings(chunkId: string): Promise<ResourceEmbedding[]>;
  deleteResourceEmbedding(id: string): Promise<void>;
}
