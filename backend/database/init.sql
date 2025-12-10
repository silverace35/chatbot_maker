-- Database initialization script for Electron Chat LLM
-- This script creates the schema for profiles, chat sessions, messages, and resources

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    system_context TEXT NOT NULL,
    rag_enabled BOOLEAN DEFAULT FALSE,
    embedding_model_id VARCHAR(255),
    rag_settings JSONB DEFAULT '{"topK": 5, "similarityThreshold": 0.7}'::jsonb,
    index_status VARCHAR(50) DEFAULT 'none' CHECK (index_status IN ('none', 'pending', 'processing', 'ready', 'stale', 'error')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Chat sessions table
CREATE TABLE IF NOT EXISTS chat_sessions (
    id VARCHAR(255) PRIMARY KEY,
    profile_id VARCHAR(255) NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Resources table (for Phase 6-7 - RAG documents)
CREATE TABLE IF NOT EXISTS resources (
    id VARCHAR(255) PRIMARY KEY,
    profile_id VARCHAR(255) NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('file', 'text')),
    original_name VARCHAR(255),
    content_path VARCHAR(500),
    mime_type VARCHAR(100),
    size_bytes INTEGER,
    metadata JSONB DEFAULT '{}'::jsonb,
    indexed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexing jobs table (for Phase 6-7 - RAG indexing status)
CREATE TABLE IF NOT EXISTS indexing_jobs (
    id VARCHAR(255) PRIMARY KEY,
    profile_id VARCHAR(255) NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    total_steps INTEGER DEFAULT 0,
    processed_steps INTEGER DEFAULT 0,
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    error TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Resource chunks table (for Phase 6-7 - text chunks for RAG)
CREATE TABLE IF NOT EXISTS resource_chunks (
    id VARCHAR(255) PRIMARY KEY,
    resource_id VARCHAR(255) NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    profile_id VARCHAR(255) NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Resource embeddings table (for Phase 6-7 - vector embeddings metadata)
-- Note: Actual vectors stored in Qdrant, this table tracks metadata
CREATE TABLE IF NOT EXISTS resource_embeddings (
    id VARCHAR(255) PRIMARY KEY,
    chunk_id VARCHAR(255) NOT NULL REFERENCES resource_chunks(id) ON DELETE CASCADE,
    profile_id VARCHAR(255) NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    embedding_model_id VARCHAR(255) NOT NULL,
    vector_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(chunk_id, embedding_model_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_sessions_profile_id ON chat_sessions(profile_id);
CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);
CREATE INDEX IF NOT EXISTS idx_resources_profile_id ON resources(profile_id);
CREATE INDEX IF NOT EXISTS idx_indexing_jobs_profile_id ON indexing_jobs(profile_id);
CREATE INDEX IF NOT EXISTS idx_indexing_jobs_status ON indexing_jobs(status);
CREATE INDEX IF NOT EXISTS idx_resource_chunks_resource_id ON resource_chunks(resource_id);
CREATE INDEX IF NOT EXISTS idx_resource_chunks_profile_id ON resource_chunks(profile_id);
CREATE INDEX IF NOT EXISTS idx_resource_embeddings_chunk_id ON resource_embeddings(chunk_id);
CREATE INDEX IF NOT EXISTS idx_resource_embeddings_profile_id ON resource_embeddings(profile_id);
CREATE INDEX IF NOT EXISTS idx_resource_embeddings_model ON resource_embeddings(embedding_model_id);

-- Insert default profiles for testing
INSERT INTO profiles (id, name, description, system_context, embedding_model_id, created_at)
VALUES
    ('profile_default_assistant', 'Assistant général', 'Assistant utile et polyvalent', 'Tu es un assistant utile et polyvalent. Réponds de manière claire et concise.', 'nomic-embed-text', CURRENT_TIMESTAMP),
    ('profile_default_python', 'Expert Python', 'Expert en programmation Python', 'Tu es un expert Python. Réponds toujours en donnant des exemples de code clairs et commentés.', 'nomic-embed-text', CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;
