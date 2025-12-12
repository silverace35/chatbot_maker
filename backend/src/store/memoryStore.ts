import { Profile, CreateProfilePayload, UpdateProfilePayload } from '../models/profile';
import { ChatSession, Message } from '../models/chatSession';
import { Resource, CreateResourcePayload, ResourceChunk, ResourceEmbedding } from '../models/resource';
import { IndexingJob, CreateIndexingJobPayload, UpdateIndexingJobPayload } from '../models/indexingJob';
import { IStore } from './IStore';

class MemoryStore implements IStore {
  private profiles: Map<string, Profile> = new Map();
  private sessions: Map<string, ChatSession> = new Map();
  private resources: Map<string, Resource> = new Map();
  private indexingJobs: Map<string, IndexingJob> = new Map();
  private resourceChunks: Map<string, ResourceChunk> = new Map();
  private resourceEmbeddings: Map<string, ResourceEmbedding> = new Map();

  // Profile methods
  async createProfile(payload: CreateProfilePayload): Promise<Profile> {
    const profile: Profile = {
      id: `profile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: payload.name,
      description: payload.description,
      system_context: payload.system_context,
      ragEnabled: payload.ragEnabled || false,
      embeddingModelId: payload.embeddingModelId,
      ragSettings: payload.ragSettings || { topK: 5, similarityThreshold: 0.7 },
      indexStatus: 'none',
      createdAt: new Date(),
    };
    this.profiles.set(profile.id, profile);
    return profile;
  }

  async getProfile(id: string): Promise<Profile | undefined> {
    return this.profiles.get(id);
  }

  async listProfiles(): Promise<Profile[]> {
    return Array.from(this.profiles.values());
  }

  async updateProfile(id: string, payload: UpdateProfilePayload): Promise<Profile | undefined> {
    const profile = this.profiles.get(id);
    if (!profile) return undefined;

    if (payload.name !== undefined) profile.name = payload.name;
    if (payload.description !== undefined) profile.description = payload.description;
    if (payload.system_context !== undefined) profile.system_context = payload.system_context;
    if (payload.ragEnabled !== undefined) profile.ragEnabled = payload.ragEnabled;
    if (payload.embeddingModelId !== undefined) profile.embeddingModelId = payload.embeddingModelId;
    if (payload.ragSettings !== undefined) profile.ragSettings = payload.ragSettings;
    if (payload.indexStatus !== undefined) profile.indexStatus = payload.indexStatus;

    this.profiles.set(id, profile);
    return profile;
  }

  async deleteProfile(id: string): Promise<void> {
    this.profiles.delete(id);
  }

  // Session methods
  async createSession(profileId: string): Promise<ChatSession> {
    const session: ChatSession = {
      id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      profileId,
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.sessions.set(session.id, session);
    return session;
  }

  async getSession(id: string): Promise<ChatSession | undefined> {
    const session = this.sessions.get(id);
    if (!session) return undefined;

    // Trier les messages par timestamp pour garantir l'ordre correct
    // même si les messages ont été ajoutés dans le désordre (requêtes parallèles)
    const sortedMessages = [...session.messages].sort((a, b) => {
      const timeA = a.timestamp instanceof Date ? a.timestamp.getTime() : new Date(a.timestamp).getTime();
      const timeB = b.timestamp instanceof Date ? b.timestamp.getTime() : new Date(b.timestamp).getTime();
      return timeA - timeB;
    });

    return {
      ...session,
      messages: sortedMessages,
    };
  }

  async listSessions(): Promise<ChatSession[]> {
    const sessions = Array.from(this.sessions.values());

    // Trier les messages de chaque session par timestamp
    return sessions.map(session => ({
      ...session,
      messages: [...session.messages].sort((a, b) => {
        const timeA = a.timestamp instanceof Date ? a.timestamp.getTime() : new Date(a.timestamp).getTime();
        const timeB = b.timestamp instanceof Date ? b.timestamp.getTime() : new Date(b.timestamp).getTime();
        return timeA - timeB;
      }),
    })).sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  async listSessionsByProfile(profileId: string): Promise<ChatSession[]> {
    const sessions = Array.from(this.sessions.values())
      .filter(s => s.profileId === profileId);

    // Trier les messages de chaque session par timestamp
    return sessions.map(session => ({
      ...session,
      messages: [...session.messages].sort((a, b) => {
        const timeA = a.timestamp instanceof Date ? a.timestamp.getTime() : new Date(a.timestamp).getTime();
        const timeB = b.timestamp instanceof Date ? b.timestamp.getTime() : new Date(b.timestamp).getTime();
        return timeA - timeB;
      }),
    })).sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  async updateSession(id: string, messages: Message[]): Promise<ChatSession | undefined> {
    const session = this.sessions.get(id);
    if (!session) return undefined;

    session.messages = messages;
    session.updatedAt = new Date();
    this.sessions.set(id, session);
    return session;
  }

  async addMessageToSession(sessionId: string, message: Message): Promise<ChatSession | undefined> {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;

    session.messages.push(message);
    session.updatedAt = new Date();
    this.sessions.set(sessionId, session);
    return session;
  }

  // Resource methods
  async createResource(payload: CreateResourcePayload): Promise<Resource> {
    const resource: Resource = {
      id: `resource_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      profileId: payload.profileId,
      type: payload.type,
      originalName: payload.originalName,
      contentPath: payload.contentPath,
      mimeType: payload.mimeType,
      sizeBytes: payload.sizeBytes,
      metadata: payload.metadata || {},
      indexed: false,
      createdAt: new Date(),
    };
    this.resources.set(resource.id, resource);
    return resource;
  }

  async getResource(id: string): Promise<Resource | undefined> {
    return this.resources.get(id);
  }

  async listResources(profileId: string): Promise<Resource[]> {
    return Array.from(this.resources.values()).filter(r => r.profileId === profileId);
  }

  async updateResource(id: string, payload: Partial<Resource>): Promise<Resource | undefined> {
    const resource = this.resources.get(id);
    if (!resource) return undefined;

    Object.assign(resource, payload);
    this.resources.set(id, resource);
    return resource;
  }

  async deleteResource(id: string): Promise<void> {
    this.resources.delete(id);
  }

  // Indexing job methods
  async createIndexingJob(payload: CreateIndexingJobPayload): Promise<IndexingJob> {
    const job: IndexingJob = {
      id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      profileId: payload.profileId,
      status: 'pending',
      totalSteps: payload.totalSteps || 0,
      processedSteps: 0,
      progress: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.indexingJobs.set(job.id, job);
    return job;
  }

  async getIndexingJob(id: string): Promise<IndexingJob | undefined> {
    return this.indexingJobs.get(id);
  }

  async listIndexingJobs(profileId: string): Promise<IndexingJob[]> {
    return Array.from(this.indexingJobs.values()).filter(j => j.profileId === profileId);
  }

  async updateIndexingJob(id: string, payload: UpdateIndexingJobPayload): Promise<IndexingJob | undefined> {
    const job = this.indexingJobs.get(id);
    if (!job) return undefined;

    if (payload.status !== undefined) job.status = payload.status;
    if (payload.processedSteps !== undefined) job.processedSteps = payload.processedSteps;
    if (payload.totalSteps !== undefined) job.totalSteps = payload.totalSteps;
    if (payload.error !== undefined) job.error = payload.error;

    job.progress = job.totalSteps > 0 ? Math.round((job.processedSteps / job.totalSteps) * 100) : 0;
    job.updatedAt = new Date();

    this.indexingJobs.set(id, job);
    return job;
  }

  // Resource chunk methods
  async createResourceChunk(payload: {
    resourceId: string;
    profileId: string;
    chunkIndex: number;
    content: string;
    metadata: Record<string, any>;
  }): Promise<string> {
    const id = `chunk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const chunk: ResourceChunk = {
      id,
      resourceId: payload.resourceId,
      profileId: payload.profileId,
      chunkIndex: payload.chunkIndex,
      content: payload.content,
      metadata: payload.metadata,
      createdAt: new Date(),
    };
    this.resourceChunks.set(id, chunk);
    return id;
  }

  async getResourceChunk(id: string): Promise<ResourceChunk | undefined> {
    return this.resourceChunks.get(id);
  }

  async listResourceChunks(resourceId: string): Promise<ResourceChunk[]> {
    return Array.from(this.resourceChunks.values())
      .filter(c => c.resourceId === resourceId)
      .sort((a, b) => a.chunkIndex - b.chunkIndex);
  }

  async deleteResourceChunk(id: string): Promise<void> {
    this.resourceChunks.delete(id);
  }

  // Resource embedding methods
  async createResourceEmbedding(payload: {
    chunkId: string;
    profileId: string;
    embeddingModelId: string;
    vectorId: string;
  }): Promise<string> {
    const id = `embedding_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const embedding: ResourceEmbedding = {
      id,
      chunkId: payload.chunkId,
      profileId: payload.profileId,
      embeddingModelId: payload.embeddingModelId,
      vectorId: payload.vectorId,
      createdAt: new Date(),
    };
    this.resourceEmbeddings.set(id, embedding);
    return id;
  }

  async getResourceEmbedding(id: string): Promise<ResourceEmbedding | undefined> {
    return this.resourceEmbeddings.get(id);
  }

  async listResourceEmbeddings(chunkId: string): Promise<ResourceEmbedding[]> {
    return Array.from(this.resourceEmbeddings.values()).filter(e => e.chunkId === chunkId);
  }

  async deleteResourceEmbedding(id: string): Promise<void> {
    this.resourceEmbeddings.delete(id);
  }
}

// Singleton instance
export const memoryStore = new MemoryStore();
