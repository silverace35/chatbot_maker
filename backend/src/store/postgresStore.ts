import { Pool } from 'pg';
import { Profile, CreateProfilePayload, UpdateProfilePayload } from '../models/profile';
import { ChatSession, Message } from '../models/chatSession';
import { Resource, CreateResourcePayload, ResourceChunk, ResourceEmbedding } from '../models/resource';
import { IndexingJob, CreateIndexingJobPayload, UpdateIndexingJobPayload } from '../models/indexingJob';
import { db } from '../config/database';
import { IStore } from './IStore';

class PostgresStore implements IStore {
  private getPool(): Pool {
    return db.getPool();
  }

  // Profile methods
  async createProfile(payload: CreateProfilePayload): Promise<Profile> {
    const pool = this.getPool();
    const id = `profile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const createdAt = new Date();

    const ragEnabled = payload.ragEnabled || false;
    const embeddingModelId = payload.embeddingModelId || null;
    const ragSettings = payload.ragSettings || { topK: 5, similarityThreshold: 0.7 };

    const query = `
      INSERT INTO profiles (id, name, description, system_context, rag_enabled, embedding_model_id, rag_settings, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, name, description, system_context, rag_enabled, embedding_model_id, rag_settings, index_status, created_at
    `;
    
    const values = [id, payload.name, payload.description || null, payload.system_context, ragEnabled, embeddingModelId, JSON.stringify(ragSettings), createdAt];
    const result = await pool.query(query, values);
    
    const row = result.rows[0];
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      system_context: row.system_context,
      ragEnabled: row.rag_enabled,
      embeddingModelId: row.embedding_model_id,
      ragSettings: row.rag_settings,
      indexStatus: row.index_status,
      createdAt: new Date(row.created_at),
    };
  }

  async getProfile(id: string): Promise<Profile | undefined> {
    const pool = this.getPool();
    const query = 'SELECT id, name, description, system_context, rag_enabled, embedding_model_id, rag_settings, index_status, created_at FROM profiles WHERE id = $1';
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return undefined;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      system_context: row.system_context,
      ragEnabled: row.rag_enabled,
      embeddingModelId: row.embedding_model_id,
      ragSettings: row.rag_settings,
      indexStatus: row.index_status,
      createdAt: new Date(row.created_at),
    };
  }

  async listProfiles(): Promise<Profile[]> {
    const pool = this.getPool();
    const query = 'SELECT id, name, description, system_context, rag_enabled, embedding_model_id, rag_settings, index_status, created_at FROM profiles ORDER BY created_at DESC';
    const result = await pool.query(query);
    
    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      system_context: row.system_context,
      ragEnabled: row.rag_enabled,
      embeddingModelId: row.embedding_model_id,
      ragSettings: row.rag_settings,
      indexStatus: row.index_status,
      createdAt: new Date(row.created_at),
    }));
  }

  async updateProfile(id: string, payload: UpdateProfilePayload): Promise<Profile | undefined> {
    const pool = this.getPool();
    
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (payload.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(payload.name);
    }
    if (payload.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(payload.description);
    }
    if (payload.system_context !== undefined) {
      updates.push(`system_context = $${paramIndex++}`);
      values.push(payload.system_context);
    }
    if (payload.ragEnabled !== undefined) {
      updates.push(`rag_enabled = $${paramIndex++}`);
      values.push(payload.ragEnabled);
    }
    if (payload.embeddingModelId !== undefined) {
      updates.push(`embedding_model_id = $${paramIndex++}`);
      values.push(payload.embeddingModelId);
    }
    if (payload.ragSettings !== undefined) {
      updates.push(`rag_settings = $${paramIndex++}`);
      values.push(JSON.stringify(payload.ragSettings));
    }
    if (payload.indexStatus !== undefined) {
      updates.push(`index_status = $${paramIndex++}`);
      values.push(payload.indexStatus);
    }

    if (updates.length === 0) {
      return this.getProfile(id);
    }

    values.push(id);
    const query = `
      UPDATE profiles
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, name, description, system_context, rag_enabled, embedding_model_id, rag_settings, index_status, created_at
    `;

    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      return undefined;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      system_context: row.system_context,
      ragEnabled: row.rag_enabled,
      embeddingModelId: row.embedding_model_id,
      ragSettings: row.rag_settings,
      indexStatus: row.index_status,
      createdAt: new Date(row.created_at),
    };
  }

  // Session methods
  async createSession(profileId: string): Promise<ChatSession> {
    const pool = this.getPool();
    const id = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const createdAt = new Date();

    const query = `
      INSERT INTO chat_sessions (id, profile_id, created_at, updated_at)
      VALUES ($1, $2, $3, $4)
      RETURNING id, profile_id, created_at, updated_at
    `;
    
    const values = [id, profileId, createdAt, createdAt];
    const result = await pool.query(query, values);
    
    const row = result.rows[0];
    return {
      id: row.id,
      profileId: row.profile_id,
      messages: [],
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  async getSession(id: string): Promise<ChatSession | undefined> {
    const pool = this.getPool();
    
    // Get session info
    const sessionQuery = 'SELECT id, profile_id, created_at, updated_at FROM chat_sessions WHERE id = $1';
    const sessionResult = await pool.query(sessionQuery, [id]);
    
    if (sessionResult.rows.length === 0) {
      return undefined;
    }

    const sessionRow = sessionResult.rows[0];

    // Get messages for this session
    const messagesQuery = `
      SELECT role, content, timestamp
      FROM messages
      WHERE session_id = $1
      ORDER BY timestamp ASC
    `;
    const messagesResult = await pool.query(messagesQuery, [id]);
    
    const messages: Message[] = messagesResult.rows.map(row => ({
      role: row.role,
      content: row.content,
      timestamp: new Date(row.timestamp),
    }));

    return {
      id: sessionRow.id,
      profileId: sessionRow.profile_id,
      messages,
      createdAt: new Date(sessionRow.created_at),
      updatedAt: new Date(sessionRow.updated_at),
    };
  }

  async updateSession(id: string, messages: Message[]): Promise<ChatSession | undefined> {
    const pool = this.getPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Update session updated_at
      const updateSessionQuery = `
        UPDATE chat_sessions
        SET updated_at = $1
        WHERE id = $2
        RETURNING id, profile_id, created_at, updated_at
      `;
      const sessionResult = await client.query(updateSessionQuery, [new Date(), id]);

      if (sessionResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return undefined;
      }

      // Delete existing messages
      await client.query('DELETE FROM messages WHERE session_id = $1', [id]);

      // Insert new messages
      for (const message of messages) {
        const insertMessageQuery = `
          INSERT INTO messages (session_id, role, content, timestamp)
          VALUES ($1, $2, $3, $4)
        `;
        await client.query(insertMessageQuery, [id, message.role, message.content, message.timestamp]);
      }

      await client.query('COMMIT');

      const sessionRow = sessionResult.rows[0];
      return {
        id: sessionRow.id,
        profileId: sessionRow.profile_id,
        messages,
        createdAt: new Date(sessionRow.created_at),
        updatedAt: new Date(sessionRow.updated_at),
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async addMessageToSession(sessionId: string, message: Message): Promise<ChatSession | undefined> {
    const pool = this.getPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Update session updated_at
      const updateSessionQuery = `
        UPDATE chat_sessions
        SET updated_at = $1
        WHERE id = $2
        RETURNING id, profile_id, created_at, updated_at
      `;
      const sessionResult = await client.query(updateSessionQuery, [new Date(), sessionId]);

      if (sessionResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return undefined;
      }

      // Insert new message
      const insertMessageQuery = `
        INSERT INTO messages (session_id, role, content, timestamp)
        VALUES ($1, $2, $3, $4)
      `;
      await client.query(insertMessageQuery, [sessionId, message.role, message.content, message.timestamp]);

      // Get all messages
      const messagesQuery = `
        SELECT role, content, timestamp
        FROM messages
        WHERE session_id = $1
        ORDER BY timestamp ASC
      `;
      const messagesResult = await client.query(messagesQuery, [sessionId]);

      await client.query('COMMIT');

      const messages: Message[] = messagesResult.rows.map(row => ({
        role: row.role,
        content: row.content,
        timestamp: new Date(row.timestamp),
      }));

      const sessionRow = sessionResult.rows[0];
      return {
        id: sessionRow.id,
        profileId: sessionRow.profile_id,
        messages,
        createdAt: new Date(sessionRow.created_at),
        updatedAt: new Date(sessionRow.updated_at),
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Resource methods
  async createResource(payload: CreateResourcePayload): Promise<Resource> {
    const pool = this.getPool();
    const id = `resource_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const createdAt = new Date();

    const query = `
      INSERT INTO resources (id, profile_id, type, original_name, content_path, mime_type, size_bytes, metadata, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, profile_id, type, original_name, content_path, mime_type, size_bytes, metadata, indexed, created_at
    `;

    const values = [
      id,
      payload.profileId,
      payload.type,
      payload.originalName || null,
      payload.contentPath,
      payload.mimeType || null,
      payload.sizeBytes || null,
      JSON.stringify(payload.metadata || {}),
      createdAt
    ];

    const result = await pool.query(query, values);
    const row = result.rows[0];

    return {
      id: row.id,
      profileId: row.profile_id,
      type: row.type,
      originalName: row.original_name,
      contentPath: row.content_path,
      mimeType: row.mime_type,
      sizeBytes: row.size_bytes,
      metadata: row.metadata,
      indexed: row.indexed,
      createdAt: new Date(row.created_at),
    };
  }

  async getResource(id: string): Promise<Resource | undefined> {
    const pool = this.getPool();
    const query = 'SELECT id, profile_id, type, original_name, content_path, mime_type, size_bytes, metadata, indexed, created_at FROM resources WHERE id = $1';
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return undefined;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      profileId: row.profile_id,
      type: row.type,
      originalName: row.original_name,
      contentPath: row.content_path,
      mimeType: row.mime_type,
      sizeBytes: row.size_bytes,
      metadata: row.metadata,
      indexed: row.indexed,
      createdAt: new Date(row.created_at),
    };
  }

  async listResources(profileId: string): Promise<Resource[]> {
    const pool = this.getPool();
    const query = 'SELECT id, profile_id, type, original_name, content_path, mime_type, size_bytes, metadata, indexed, created_at FROM resources WHERE profile_id = $1 ORDER BY created_at DESC';
    const result = await pool.query(query, [profileId]);

    return result.rows.map(row => ({
      id: row.id,
      profileId: row.profile_id,
      type: row.type,
      originalName: row.original_name,
      contentPath: row.content_path,
      mimeType: row.mime_type,
      sizeBytes: row.size_bytes,
      metadata: row.metadata,
      indexed: row.indexed,
      createdAt: new Date(row.created_at),
    }));
  }

  async updateResource(id: string, payload: Partial<Resource>): Promise<Resource | undefined> {
    const pool = this.getPool();

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (payload.indexed !== undefined) {
      updates.push(`indexed = $${paramIndex++}`);
      values.push(payload.indexed);
    }
    if (payload.metadata !== undefined) {
      updates.push(`metadata = $${paramIndex++}`);
      values.push(JSON.stringify(payload.metadata));
    }

    if (updates.length === 0) {
      return this.getResource(id);
    }

    values.push(id);
    const query = `
      UPDATE resources
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, profile_id, type, original_name, content_path, mime_type, size_bytes, metadata, indexed, created_at
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return undefined;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      profileId: row.profile_id,
      type: row.type,
      originalName: row.original_name,
      contentPath: row.content_path,
      mimeType: row.mime_type,
      sizeBytes: row.size_bytes,
      metadata: row.metadata,
      indexed: row.indexed,
      createdAt: new Date(row.created_at),
    };
  }

  async deleteResource(id: string): Promise<void> {
    const pool = this.getPool();
    await pool.query('DELETE FROM resources WHERE id = $1', [id]);
  }

  // Indexing job methods
  async createIndexingJob(payload: CreateIndexingJobPayload): Promise<IndexingJob> {
    const pool = this.getPool();
    const id = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const createdAt = new Date();
    const totalSteps = payload.totalSteps || 0;

    const query = `
      INSERT INTO indexing_jobs (id, profile_id, status, total_steps, processed_steps, progress, created_at, updated_at)
      VALUES ($1, $2, 'pending', $3, 0, 0, $4, $5)
      RETURNING id, profile_id, status, total_steps, processed_steps, progress, error, created_at, updated_at
    `;

    const values = [id, payload.profileId, totalSteps, createdAt, createdAt];
    const result = await pool.query(query, values);
    const row = result.rows[0];

    return {
      id: row.id,
      profileId: row.profile_id,
      status: row.status,
      totalSteps: row.total_steps,
      processedSteps: row.processed_steps,
      progress: row.progress,
      error: row.error,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  async getIndexingJob(id: string): Promise<IndexingJob | undefined> {
    const pool = this.getPool();
    const query = 'SELECT id, profile_id, status, total_steps, processed_steps, progress, error, created_at, updated_at FROM indexing_jobs WHERE id = $1';
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return undefined;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      profileId: row.profile_id,
      status: row.status,
      totalSteps: row.total_steps,
      processedSteps: row.processed_steps,
      progress: row.progress,
      error: row.error,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  async listIndexingJobs(profileId: string): Promise<IndexingJob[]> {
    const pool = this.getPool();
    const query = 'SELECT id, profile_id, status, total_steps, processed_steps, progress, error, created_at, updated_at FROM indexing_jobs WHERE profile_id = $1 ORDER BY created_at DESC';
    const result = await pool.query(query, [profileId]);

    return result.rows.map(row => ({
      id: row.id,
      profileId: row.profile_id,
      status: row.status,
      totalSteps: row.total_steps,
      processedSteps: row.processed_steps,
      progress: row.progress,
      error: row.error,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }));
  }

  async updateIndexingJob(id: string, payload: UpdateIndexingJobPayload): Promise<IndexingJob | undefined> {
    const pool = this.getPool();
    const updatedAt = new Date();

    const updates: string[] = ['updated_at = $1'];
    const values: any[] = [updatedAt];
    let paramIndex = 2;

    if (payload.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(payload.status);
    }
    if (payload.processedSteps !== undefined) {
      updates.push(`processed_steps = $${paramIndex++}`);
      values.push(payload.processedSteps);
    }
    if (payload.totalSteps !== undefined) {
      updates.push(`total_steps = $${paramIndex++}`);
      values.push(payload.totalSteps);
    }

    // Gestion de progress :
    // - si payload.progress est fourni, l'utiliser directement
    // - sinon, si processedSteps/totalSteps sont mis à jour, recalculer côté SQL
    if (payload.progress !== undefined) {
      updates.push(`progress = $${paramIndex++}`);
      values.push(payload.progress);
    } else if (payload.processedSteps !== undefined || payload.totalSteps !== undefined) {
      updates.push('progress = CASE WHEN total_steps > 0 THEN ROUND((processed_steps::FLOAT / total_steps::FLOAT) * 100) ELSE 0 END');
    }

    if (payload.error !== undefined) {
      updates.push(`error = $${paramIndex++}`);
      values.push(payload.error);
    }

    values.push(id);
    const query = `
      UPDATE indexing_jobs
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, profile_id, status, total_steps, processed_steps, progress, error, created_at, updated_at
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return undefined;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      profileId: row.profile_id,
      status: row.status,
      totalSteps: row.total_steps,
      processedSteps: row.processed_steps,
      progress: row.progress,
      error: row.error,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  // Resource chunk methods
  async createResourceChunk(payload: {
    resourceId: string;
    profileId: string;
    chunkIndex: number;
    content: string;
    metadata: Record<string, any>;
  }): Promise<string> {
    const pool = this.getPool();
    const id = `chunk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const createdAt = new Date();

    const query = `
      INSERT INTO resource_chunks (id, resource_id, profile_id, chunk_index, content, metadata, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `;

    const values = [id, payload.resourceId, payload.profileId, payload.chunkIndex, payload.content, JSON.stringify(payload.metadata), createdAt];
    await pool.query(query, values);

    return id;
  }

  async getResourceChunk(id: string): Promise<ResourceChunk | undefined> {
    const pool = this.getPool();
    const query = 'SELECT id, resource_id, profile_id, chunk_index, content, metadata, created_at FROM resource_chunks WHERE id = $1';
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return undefined;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      resourceId: row.resource_id,
      profileId: row.profile_id,
      chunkIndex: row.chunk_index,
      content: row.content,
      metadata: row.metadata,
      createdAt: new Date(row.created_at),
    };
  }

  async listResourceChunks(resourceId: string): Promise<ResourceChunk[]> {
    const pool = this.getPool();
    const query = 'SELECT id, resource_id, profile_id, chunk_index, content, metadata, created_at FROM resource_chunks WHERE resource_id = $1 ORDER BY chunk_index ASC';
    const result = await pool.query(query, [resourceId]);

    return result.rows.map(row => ({
      id: row.id,
      resourceId: row.resource_id,
      profileId: row.profile_id,
      chunkIndex: row.chunk_index,
      content: row.content,
      metadata: row.metadata,
      createdAt: new Date(row.created_at),
    }));
  }

  async deleteResourceChunk(id: string): Promise<void> {
    const pool = this.getPool();
    await pool.query('DELETE FROM resource_chunks WHERE id = $1', [id]);
  }

  // Resource embedding methods
  async createResourceEmbedding(payload: {
    chunkId: string;
    profileId: string;
    embeddingModelId: string;
    vectorId: string;
  }): Promise<string> {
    const pool = this.getPool();
    const id = `embedding_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const createdAt = new Date();

    const query = `
      INSERT INTO resource_embeddings (id, chunk_id, profile_id, embedding_model_id, vector_id, created_at)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `;

    const values = [id, payload.chunkId, payload.profileId, payload.embeddingModelId, payload.vectorId, createdAt];
    await pool.query(query, values);

    return id;
  }

  async getResourceEmbedding(id: string): Promise<ResourceEmbedding | undefined> {
    const pool = this.getPool();
    const query = 'SELECT id, chunk_id, profile_id, embedding_model_id, vector_id, created_at FROM resource_embeddings WHERE id = $1';
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return undefined;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      chunkId: row.chunk_id,
      profileId: row.profile_id,
      embeddingModelId: row.embedding_model_id,
      vectorId: row.vector_id,
      createdAt: new Date(row.created_at),
    };
  }

  async listResourceEmbeddings(chunkId: string): Promise<ResourceEmbedding[]> {
    const pool = this.getPool();
    const query = 'SELECT id, chunk_id, profile_id, embedding_model_id, vector_id, created_at FROM resource_embeddings WHERE chunk_id = $1';
    const result = await pool.query(query, [chunkId]);

    return result.rows.map(row => ({
      id: row.id,
      chunkId: row.chunk_id,
      profileId: row.profile_id,
      embeddingModelId: row.embedding_model_id,
      vectorId: row.vector_id,
      createdAt: new Date(row.created_at),
    }));
  }

  async deleteResourceEmbedding(id: string): Promise<void> {
    const pool = this.getPool();
    await pool.query('DELETE FROM resource_embeddings WHERE id = $1', [id]);
  }
}

// Singleton instance
export const postgresStore = new PostgresStore();
