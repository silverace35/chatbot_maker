# Modèle Physique de Données (MPD) - ChatBot Maker

## Diagramme de la Base de Données (dbdiagram.io)

```dbml
// ChatBot Maker - Modèle Physique de Données
// Compatible avec dbdiagram.io

Table profiles {
  id varchar(255) [pk, note: 'Identifiant unique du profil']
  name varchar(255) [not null, note: 'Nom du profil']
  description text [note: 'Description du profil']
  system_context text [not null, note: 'Contexte système pour le LLM']
  rag_enabled boolean [default: false, note: 'Mode RAG activé ou non']
  embedding_model_id varchar(255) [note: 'Modèle d\'embedding utilisé']
  rag_settings jsonb [default: '{"topK": 5, "similarityThreshold": 0.7}', note: 'Paramètres RAG (topK, similarityThreshold)']
  index_status varchar(50) [default: 'none', note: 'Statut d\'indexation: none|pending|processing|ready|stale|error']
  created_at timestamp [not null, default: `CURRENT_TIMESTAMP`, note: 'Date de création']
}

Table chat_sessions {
  id varchar(255) [pk, note: 'Identifiant unique de la session']
  profile_id varchar(255) [not null, ref: > profiles.id, note: 'Référence au profil utilisé']
  created_at timestamp [not null, default: `CURRENT_TIMESTAMP`, note: 'Date de création']
  updated_at timestamp [not null, default: `CURRENT_TIMESTAMP`, note: 'Date de dernière mise à jour']
}

Table messages {
  id serial [pk, note: 'Identifiant auto-incrémenté']
  session_id varchar(255) [not null, ref: > chat_sessions.id, note: 'Référence à la session de chat']
  role varchar(20) [not null, note: 'Rôle: user|assistant|system']
  content text [not null, note: 'Contenu du message']
  timestamp timestamp [not null, default: `CURRENT_TIMESTAMP`, note: 'Date/heure du message']
}

Table resources {
  id varchar(255) [pk, note: 'Identifiant unique de la ressource']
  profile_id varchar(255) [not null, ref: > profiles.id, note: 'Référence au profil propriétaire']
  type varchar(50) [not null, note: 'Type: file|text']
  original_name varchar(255) [note: 'Nom original du fichier']
  content_path varchar(500) [note: 'Chemin vers le contenu']
  mime_type varchar(100) [note: 'Type MIME du fichier']
  size_bytes integer [note: 'Taille en octets']
  metadata jsonb [default: '{}', note: 'Métadonnées additionnelles']
  indexed boolean [default: false, note: 'Ressource indexée ou non']
  created_at timestamp [not null, default: `CURRENT_TIMESTAMP`, note: 'Date de création']
}

Table indexing_jobs {
  id varchar(255) [pk, note: 'Identifiant unique du job']
  profile_id varchar(255) [not null, ref: > profiles.id, note: 'Référence au profil']
  status varchar(50) [not null, note: 'Statut: pending|processing|completed|failed']
  total_steps integer [default: 0, note: 'Nombre total d\'étapes']
  processed_steps integer [default: 0, note: 'Étapes traitées']
  progress integer [default: 0, note: 'Progression 0-100%']
  error text [note: 'Message d\'erreur si échec']
  created_at timestamp [not null, default: `CURRENT_TIMESTAMP`, note: 'Date de création']
  updated_at timestamp [not null, default: `CURRENT_TIMESTAMP`, note: 'Date de mise à jour']
}

Table resource_chunks {
  id varchar(255) [pk, note: 'Identifiant unique du chunk']
  resource_id varchar(255) [not null, ref: > resources.id, note: 'Référence à la ressource source']
  profile_id varchar(255) [not null, ref: > profiles.id, note: 'Référence au profil']
  chunk_index integer [not null, note: 'Index du chunk dans la ressource']
  content text [not null, note: 'Contenu textuel du chunk']
  metadata jsonb [default: '{}', note: 'Métadonnées du chunk']
  created_at timestamp [not null, default: `CURRENT_TIMESTAMP`, note: 'Date de création']
}

Table resource_embeddings {
  id varchar(255) [pk, note: 'Identifiant unique de l\'embedding']
  chunk_id varchar(255) [not null, ref: > resource_chunks.id, note: 'Référence au chunk source']
  profile_id varchar(255) [not null, ref: > profiles.id, note: 'Référence au profil']
  embedding_model_id varchar(255) [not null, note: 'Identifiant du modèle d\'embedding']
  vector_id varchar(255) [not null, note: 'ID du vecteur dans Qdrant']
  created_at timestamp [not null, default: `CURRENT_TIMESTAMP`, note: 'Date de création']

  indexes {
    (chunk_id, embedding_model_id) [unique, note: 'Un chunk ne peut avoir qu\'un embedding par modèle']
  }
}
```

---

## Représentation Visuelle

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                    PROFILES                                              │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐    │
│  │ id (PK) │ name │ description │ system_context │ rag_enabled │ embedding_model_id │   │
│  │ rag_settings │ index_status │ created_at                                        │   │
│  └─────────────────────────────────────────────────────────────────────────────────┘    │
└───────────────────────────────────┬─────────────────────────────────────────────────────┘
                                    │
          ┌─────────────────────────┼─────────────────────────┬───────────────────────────┐
          │                         │                         │                           │
          ▼                         ▼                         ▼                           ▼
┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐
│   CHAT_SESSIONS     │  │     RESOURCES       │  │   INDEXING_JOBS     │  │  RESOURCE_CHUNKS    │
│ ─────────────────── │  │ ─────────────────── │  │ ─────────────────── │  │ ─────────────────── │
│ id (PK)             │  │ id (PK)             │  │ id (PK)             │  │ id (PK)             │
│ profile_id (FK)     │  │ profile_id (FK)     │  │ profile_id (FK)     │  │ resource_id (FK)    │
│ created_at          │  │ type                │  │ status              │  │ profile_id (FK)     │
│ updated_at          │  │ original_name       │  │ total_steps         │  │ chunk_index         │
└──────────┬──────────┘  │ content_path        │  │ processed_steps     │  │ content             │
           │             │ mime_type           │  │ progress            │  │ metadata            │
           ▼             │ size_bytes          │  │ error               │  │ created_at          │
┌─────────────────────┐  │ metadata            │  │ created_at          │  └──────────┬──────────┘
│     MESSAGES        │  │ indexed             │  │ updated_at          │             │
│ ─────────────────── │  │ created_at          │  └─────────────────────┘             │
│ id (PK, SERIAL)     │  └──────────┬──────────┘                                      │
│ session_id (FK)     │             │                                                 │
│ role                │             │                                                 │
│ content             │             └─────────────────────────────────────────────────┤
│ timestamp           │                                                               │
└─────────────────────┘                                                               ▼
                                                                         ┌─────────────────────┐
                                                                         │ RESOURCE_EMBEDDINGS │
                                                                         │ ─────────────────── │
                                                                         │ id (PK)             │
                                                                         │ chunk_id (FK)       │
                                                                         │ profile_id (FK)     │
                                                                         │ embedding_model_id  │
                                                                         │ vector_id           │
                                                                         │ created_at          │
                                                                         └─────────────────────┘
```

---

## Description des Tables et Relations

### 1. Table `profiles` (Profils de Chatbot)

**Description :** Table centrale qui stocke les différents profils de chatbot configurés. Chaque profil définit le comportement et le contexte d'un assistant virtuel.

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | VARCHAR(255) | Clé primaire, identifiant unique généré (ex: `profile_1765474464544_v6jeq8k77`) |
| `name` | VARCHAR(255) | Nom affiché du profil |
| `description` | TEXT | Description optionnelle du profil |
| `system_context` | TEXT | Prompt système envoyé au LLM pour définir le comportement |
| `rag_enabled` | BOOLEAN | Indique si le mode RAG (Retrieval-Augmented Generation) est activé |
| `embedding_model_id` | VARCHAR(255) | Identifiant du modèle d'embedding utilisé (ex: `nomic-embed-text`) |
| `rag_settings` | JSONB | Configuration RAG : `topK` (nombre de résultats) et `similarityThreshold` (seuil de similarité) |
| `index_status` | VARCHAR(50) | Statut d'indexation des ressources RAG |
| `created_at` | TIMESTAMP | Date de création |

**Règles spécifiques :**
- `index_status` est contraint aux valeurs : `none`, `pending`, `processing`, `ready`, `stale`, `error`
- `rag_settings` a une valeur par défaut : `{"topK": 5, "similarityThreshold": 0.7}`

---

### 2. Table `chat_sessions` (Sessions de Chat)

**Description :** Représente une conversation entre un utilisateur et un profil de chatbot. Une session regroupe tous les messages d'une conversation.

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | VARCHAR(255) | Clé primaire, identifiant unique de la session |
| `profile_id` | VARCHAR(255) | Clé étrangère vers `profiles.id` |
| `created_at` | TIMESTAMP | Date de création de la session |
| `updated_at` | TIMESTAMP | Date de dernière activité |

**Relations :**
- **profiles → chat_sessions** : Relation 1:N (Un profil peut avoir plusieurs sessions de chat)
- **Cascade** : La suppression d'un profil supprime automatiquement toutes ses sessions (`ON DELETE CASCADE`)

---

### 3. Table `messages` (Messages)

**Description :** Stocke tous les messages échangés dans une session de chat, incluant les messages utilisateur, les réponses de l'assistant et les messages système.

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | SERIAL | Clé primaire auto-incrémentée |
| `session_id` | VARCHAR(255) | Clé étrangère vers `chat_sessions.id` |
| `role` | VARCHAR(20) | Rôle de l'émetteur du message |
| `content` | TEXT | Contenu textuel du message |
| `timestamp` | TIMESTAMP | Date/heure d'envoi du message |

**Règles spécifiques :**
- `role` est contraint aux valeurs : `user`, `assistant`, `system`

**Relations :**
- **chat_sessions → messages** : Relation 1:N (Une session contient plusieurs messages)
- **Cascade** : La suppression d'une session supprime tous ses messages (`ON DELETE CASCADE`)

---

### 4. Table `resources` (Ressources RAG)

**Description :** Stocke les fichiers et textes uploadés pour alimenter le système RAG d'un profil. Ces ressources sont découpées en chunks puis indexées.

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | VARCHAR(255) | Clé primaire, identifiant unique de la ressource |
| `profile_id` | VARCHAR(255) | Clé étrangère vers `profiles.id` |
| `type` | VARCHAR(50) | Type de ressource |
| `original_name` | VARCHAR(255) | Nom original du fichier uploadé |
| `content_path` | VARCHAR(500) | Chemin de stockage du fichier |
| `mime_type` | VARCHAR(100) | Type MIME (ex: `text/plain`, `application/pdf`) |
| `size_bytes` | INTEGER | Taille du fichier en octets |
| `metadata` | JSONB | Métadonnées additionnelles |
| `indexed` | BOOLEAN | Indique si la ressource a été indexée |
| `created_at` | TIMESTAMP | Date d'upload |

**Règles spécifiques :**
- `type` est contraint aux valeurs : `file`, `text`

**Relations :**
- **profiles → resources** : Relation 1:N (Un profil peut avoir plusieurs ressources)
- **Cascade** : La suppression d'un profil supprime toutes ses ressources (`ON DELETE CASCADE`)

---

### 5. Table `indexing_jobs` (Jobs d'Indexation)

**Description :** Suit l'état des jobs d'indexation RAG. Permet de monitorer la progression de l'indexation des ressources d'un profil.

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | VARCHAR(255) | Clé primaire, identifiant unique du job |
| `profile_id` | VARCHAR(255) | Clé étrangère vers `profiles.id` |
| `status` | VARCHAR(50) | Statut actuel du job |
| `total_steps` | INTEGER | Nombre total d'étapes (ressources à indexer) |
| `processed_steps` | INTEGER | Nombre d'étapes complétées |
| `progress` | INTEGER | Pourcentage de progression (0-100) |
| `error` | TEXT | Message d'erreur en cas d'échec |
| `created_at` | TIMESTAMP | Date de création du job |
| `updated_at` | TIMESTAMP | Date de dernière mise à jour |

**Règles spécifiques :**
- `status` est contraint aux valeurs : `pending`, `processing`, `completed`, `failed`
- `progress` est contraint entre 0 et 100 : `CHECK (progress >= 0 AND progress <= 100)`

**Relations :**
- **profiles → indexing_jobs** : Relation 1:N (Un profil peut avoir plusieurs jobs d'indexation historiques)
- **Cascade** : La suppression d'un profil supprime tous ses jobs (`ON DELETE CASCADE`)

---

### 6. Table `resource_chunks` (Chunks de Ressources)

**Description :** Stocke les morceaux de texte découpés à partir des ressources. Chaque ressource est divisée en chunks pour permettre une recherche vectorielle granulaire.

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | VARCHAR(255) | Clé primaire, identifiant unique du chunk |
| `resource_id` | VARCHAR(255) | Clé étrangère vers `resources.id` |
| `profile_id` | VARCHAR(255) | Clé étrangère vers `profiles.id` (dénormalisé pour performance) |
| `chunk_index` | INTEGER | Position du chunk dans la ressource (0, 1, 2, ...) |
| `content` | TEXT | Contenu textuel du chunk |
| `metadata` | JSONB | Métadonnées (position, source, etc.) |
| `created_at` | TIMESTAMP | Date de création |

**Relations :**
- **resources → resource_chunks** : Relation 1:N (Une ressource est découpée en plusieurs chunks)
- **profiles → resource_chunks** : Relation 1:N (Dénormalisée pour optimiser les requêtes)
- **Cascade** : La suppression d'une ressource ou d'un profil supprime les chunks associés (`ON DELETE CASCADE`)

**Note de conception :**
Le `profile_id` est dénormalisé (présent aussi via `resources`) pour optimiser les requêtes de recherche qui filtrent par profil sans avoir à joindre la table `resources`.

---

### 7. Table `resource_embeddings` (Embeddings de Ressources)

**Description :** Table de liaison entre les chunks et leurs représentations vectorielles. Les vecteurs réels sont stockés dans Qdrant (base vectorielle externe), cette table conserve les métadonnées et références.

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | VARCHAR(255) | Clé primaire, identifiant unique |
| `chunk_id` | VARCHAR(255) | Clé étrangère vers `resource_chunks.id` |
| `profile_id` | VARCHAR(255) | Clé étrangère vers `profiles.id` |
| `embedding_model_id` | VARCHAR(255) | Identifiant du modèle utilisé (ex: `nomic-embed-text`) |
| `vector_id` | VARCHAR(255) | Identifiant du vecteur dans Qdrant |
| `created_at` | TIMESTAMP | Date de création |

**Règles spécifiques :**
- **Contrainte d'unicité** : `UNIQUE(chunk_id, embedding_model_id)` - Un chunk ne peut avoir qu'un seul embedding par modèle

**Relations :**
- **resource_chunks → resource_embeddings** : Relation 1:N (Un chunk peut avoir plusieurs embeddings si différents modèles sont utilisés)
- **profiles → resource_embeddings** : Relation 1:N (Dénormalisée pour performance)
- **Cascade** : La suppression d'un chunk ou profil supprime les embeddings (`ON DELETE CASCADE`)

---

## Index de Performance

Les index suivants sont créés pour optimiser les requêtes fréquentes :

| Index | Table | Colonne(s) | Objectif |
|-------|-------|------------|----------|
| `idx_chat_sessions_profile_id` | chat_sessions | profile_id | Récupérer les sessions d'un profil |
| `idx_messages_session_id` | messages | session_id | Récupérer les messages d'une session |
| `idx_messages_timestamp` | messages | timestamp | Trier les messages chronologiquement |
| `idx_resources_profile_id` | resources | profile_id | Récupérer les ressources d'un profil |
| `idx_indexing_jobs_profile_id` | indexing_jobs | profile_id | Récupérer les jobs d'un profil |
| `idx_indexing_jobs_status` | indexing_jobs | status | Filtrer par statut de job |
| `idx_resource_chunks_resource_id` | resource_chunks | resource_id | Récupérer les chunks d'une ressource |
| `idx_resource_chunks_profile_id` | resource_chunks | profile_id | Recherche RAG par profil |
| `idx_resource_embeddings_chunk_id` | resource_embeddings | chunk_id | Lier embeddings aux chunks |
| `idx_resource_embeddings_profile_id` | resource_embeddings | profile_id | Recherche embeddings par profil |
| `idx_resource_embeddings_model` | resource_embeddings | embedding_model_id | Filtrer par modèle d'embedding |

---

## Flux de Données

### Flux de Conversation
```
Utilisateur → Message (role='user') → Session → Profil → LLM → Message (role='assistant')
```

### Flux RAG (Retrieval-Augmented Generation)
```
1. Upload fichier → Resource
2. Découpage → Resource_chunks
3. Génération embeddings → Resource_embeddings + Qdrant
4. Mise à jour → Indexing_job (progress) + Profile (index_status='ready')
5. Question utilisateur → Recherche vectorielle → Contexte augmenté → LLM
```

---

## Notes d'Architecture

1. **Séparation vectorielle** : Les vecteurs d'embedding sont stockés dans Qdrant (base vectorielle spécialisée) et non dans PostgreSQL. La table `resource_embeddings` ne contient que les métadonnées et références.

2. **Dénormalisation contrôlée** : Le `profile_id` est présent dans plusieurs tables (chunks, embeddings) pour éviter des jointures coûteuses lors des recherches RAG.

3. **Cascade de suppression** : Toutes les clés étrangères utilisent `ON DELETE CASCADE` pour maintenir l'intégrité référentielle automatiquement.

4. **JSONB pour flexibilité** : Les colonnes `rag_settings`, `metadata` utilisent JSONB pour permettre l'évolution du schéma sans migration.

