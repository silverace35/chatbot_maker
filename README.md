# Application Electron Chat LLM Local

Application desktop Electron + React (TypeScript) avec backend Node/TypeScript permettant de discuter avec un LLM local, avec gestion de profils et intégration RAG (Recherche Augmentée par les Données) basée sur les documents de l’utilisateur.

Ce dépôt contient l’ensemble de la stack :

- une application desktop Electron (processus main + preload) ;
- un frontend React/Vite (renderer) ;
- un backend Node/Express en TypeScript ;
- la configuration Docker pour les services annexes (PostgreSQL, Ollama, etc.).

L’objectif est de fournir un assistant IA local, personnalisable par profil et capable d’exploiter des documents indexés via des embeddings.

---

## 1. Architecture générale

Racine du projet :

```text
electron-init/
├── electron/           # Process main Electron + preload (exposition de l'API à React)
├── renderer/           # Application React (frontend, Vite)
├── backend/            # API Node/TypeScript (LLM, profils, RAG, sessions)
├── docker-compose.yml  # Orchestration Postgres/Ollama/…
├── README.md           # Documentation
└── package.json        # Scripts d'orchestration
```

### 1.1. Stack technique

- Frontend : React, TypeScript, Vite, Material-UI (MUI), React Router
- Backend : Node.js, TypeScript, Express, PostgreSQL
- Desktop : Electron
- LLM : Ollama (modèle local, GPU NVIDIA supporté) avec fallback stub
- RAG / Embeddings : Ollama (nomic-embed-text), Qdrant (vector store)
- Base de données : PostgreSQL
- Orchestration : Docker Compose

### 1.2. Architecture logique

- `electron/` :
  - Processus principal Electron (fenêtre, configuration).
  - `preload.js` : expose une API sûre à `window.api` (chat, profils, RAG) via `contextBridge`, et gère les appels HTTP/streaming vers le backend.

- `backend/` :
  - `src/routes/` : routes Express (`/api/chat`, `/api/profile`, `/api/profile/:id/rag/...`).
  - `src/services/` :
    - `llmLocal.ts` : intégration Ollama + stub, construction du contexte de conversation.
    - `ragService.ts` : indexation de ressources, génération d'embeddings, recherche vectorielle, augmentation de prompt.
    - `embeddingService.ts` : génération d'embeddings via Ollama.
    - `vectorStoreService.ts` : stockage et recherche vectorielle (implémentation en mémoire).
    - services auxiliaires (logging, stockage de fichiers, etc.).
  - `src/store/` : abstraction de persistance (mémoire ou PostgreSQL) pour profils, sessions, ressources, jobs d’indexation, embeddings.

- `renderer/` :
  - `src/modules/chat/` : 
    - `pages/ChatPage.tsx` : page de chat principale.
    - composants pour la liste de messages, l’input de chat, la sélection de profil, le panneau RAG, etc.
  - `src/modules/profile/` : gestion des profils (`ProfileSelector`, `ProfileDialog`, services). 
  - `src/services/` : 
    - `chat.service.ts` : appels à `window.api.chat` (envoi de message, stream, récupération de session).
    - `profile.service.ts` : gestion des profils via `window.api.profile`.
    - `rag.service.ts` : gestion des ressources et de l’indexation RAG.
  - `src/types/electron-api.d.ts` : contrat TypeScript des APIs exposées par le preload.

---

## 2. Installation

### 2.1. Prérequis

- Node.js 18 ou supérieur
- npm
- Docker et Docker Compose pour Postgres et Ollama (Attention aux ports utilisés)

### 2.2. Installation des dépendances

À la racine du projet :

```bash
# Dépendances du projet racine (scripts d'orchestration)
npm install

# Frontend (renderer React/Vite)
cd renderer
npm install
cd ..

# Backend (API Node/TypeScript)
cd backend
npm install
cd ..
```

### 2.3. Configuration Docker

L'environnement Docker inclut tous les services nécessaires :
- **PostgreSQL** - Base de données
- **Ollama** - LLM local (avec GPU NVIDIA par défaut)
- **Qdrant** - Vector store pour le RAG
- **ollama-init** - Télécharge automatiquement les modèles

#### Démarrage rapide (GPU NVIDIA)

```bash
# Démarrer tous les services en une commande
docker-compose up -d
```

Cette commande démarre :
- PostgreSQL sur le port `15432`
- Ollama sur le port `11434` (avec support GPU)
- Qdrant sur les ports `6333` et `6334`
- Téléchargement automatique des modèles `llama3.1:8b` et `nomic-embed-text`

#### Prérequis GPU NVIDIA

Pour utiliser le GPU, vous devez avoir :
- Les drivers NVIDIA installés (`nvidia-smi` doit fonctionner)
- Docker Desktop avec le support GPU activé (Windows/Mac) ou NVIDIA Container Toolkit (Linux)

#### Mode CPU uniquement

Si vous n'avez pas de GPU NVIDIA, commentez la section `deploy` dans `docker-compose.yml` :

```yaml
  ollama:
    # ...
    # deploy:
    #   resources:
    #     reservations:
    #       devices:
    #         - driver: nvidia
    #           count: all
    #           capabilities: [gpu]
```

#### Variables d'environnement

Créez un fichier `.env` à la racine (voir `.env.docker.example`) :

| Variable | Défaut | Description |
|----------|--------|-------------|
| `POSTGRES_PORT` | 15432 | Port PostgreSQL |
| `OLLAMA_PORT` | 11434 | Port Ollama |
| `OLLAMA_NUM_PARALLEL` | 4 | Requêtes LLM simultanées |
| `OLLAMA_MAX_LOADED_MODELS` | 2 | Modèles en mémoire GPU |
| `OLLAMA_DEFAULT_MODEL` | llama3.1:8b | Modèle de chat par défaut |
| `QDRANT_PORT` | 6333 | Port Qdrant HTTP |

#### Commandes utiles

```bash
# Voir les logs
docker-compose logs -f ollama

# Vérifier que le GPU est détecté
docker logs electron-chat-ollama 2>&1 | grep -i "GPU\|CUDA"

# Lister les modèles installés
docker exec electron-chat-ollama ollama list

# Télécharger un modèle manuellement
docker exec electron-chat-ollama ollama pull llama3.1:8b

# Arrêter tous les services
docker-compose down

# Arrêter et supprimer les volumes (reset complet)
docker-compose down -v
```

---

## 3. Lancement du projet

### 3.1. Mode développement (tout-en-un)

Depuis la racine du projet :

```bash
npm run dev:all
```

Cette commande lance en parallèle :

- le backend Express (par défaut sur `http://localhost:4000`) ;
- le renderer Vite (par défaut sur `http://localhost:5173`) ;
- Electron, qui ouvre la fenêtre de l'application desktop.

L’application Electron devrait s’ouvrir automatiquement avec l’interface de chat.

### 3.2. Mode développement (services séparés)

Lancer le backend seul :

```bash
cd backend
npm run dev
```

Lancer le frontend + Electron depuis la racine :

```bash
npm run dev
```

---

## 4. Utilisation de l'application

Une fois l’application Electron lancée :

1. Naviguer vers la page de chat ("Chat LLM").
2. Créer un profil en lui donnant un nom et un `system_context` (rôle, ton, contraintes de l’assistant).
3. Sélectionner ce profil via le sélecteur de profils.
4. Envoyer un message dans la zone de saisie.

Le backend :

- crée ou récupère une session de chat par profil ;
- enrichit le prompt avec le contexte système du profil ;
- applique le RAG si ce profil a des documents indexés ;
- appelle le LLM local via Ollama ;
- renvoie la réponse et l’historique.

Le frontend affiche la conversation et utilise un streaming de la réponse pour une expérience fluide, avec un bouton permettant d’arrêter la génération en cours.

---

## 5. Build

### 5.1. Build du frontend (renderer)

Depuis la racine :

```bash
npm run build:renderer
```

Les fichiers générés se trouvent dans :

- `renderer/dist/`

### 6.2. Build du backend

A venir
---

## 7. Principes d’architecture

### 7.1. Frontend (`renderer/`)

- Architecture orientée fonctionnalités : modules par domaine métier (`chat`, `profile`, `shared`, etc.).
- Séparation claire entre :
  - services d’accès aux APIs (`src/services/…`) ;
  - composants d’interface et pages (`src/modules/...`).
- Typage strict avec TypeScript.
- Alias de chemins type `@/` pointant vers `src/`.

### 7.2. Backend (`backend/`)

- Architecture en couches : routes → services → store.
- Modèles typés dans `src/models/`.
- Store abstrait (`memoryStore` ou `postgresStore`) permettant de basculer entre mémoire et base de données.
- Journalisation (logging) des opérations clés pour faciliter le diagnostic.

### 7.3. Electron

- Contexte isolé (`contextIsolation` activé).
- `nodeIntegration` désactivé pour des raisons de sécurité.
- API exposée au renderer via `contextBridge` dans `preload.js`.
- Communication avec le backend principalement via HTTP/fetch, y compris pour le streaming de réponses.

---

## 8. Dépannage

### 8.1. Problèmes généraux

- **Le backend ne répond pas** :
  - Vérifier que le serveur est bien lancé
  - Tester `http://localhost:4000/health` dans un navigateur
  - Vérifier que le port 4000 n'est pas déjà utilisé

- **Le frontend/Electron ne peut pas appeler l'API** :
  - Vérifier la console des DevTools Electron
  - Vérifier que `window.api` est défini
  - Vérifier l'URL backend (`--backend-url=`)

- **Messages d'erreur "API not available"** :
  - Le preload n'a pas exposé correctement l'API
  - Redémarrer l'application Electron

### 8.2. Problèmes Docker

- **Vérifier l'état des conteneurs** :
  ```bash
  docker-compose ps
  ```

- **Voir les logs d'un service** :
  ```bash
  docker-compose logs -f ollama
  ```

- **Le GPU n'est pas détecté par Ollama** :
  ```bash
  # Vérifier que nvidia-smi fonctionne
  nvidia-smi
  
  # Vérifier les logs Ollama
  docker logs electron-chat-ollama 2>&1 | grep -i "GPU\|CUDA"
  ```
  
  Si le GPU n'est pas détecté, vérifiez que Docker Desktop a le support GPU activé (Settings > Resources > GPU).

### 8.3. Problèmes Ollama

- **Premier message très lent (30-60 secondes)** :
  
  C'est le "cold start" - Ollama charge le modèle en mémoire GPU. Le backend effectue un warmup automatique au démarrage. Attendez le message `LLM model is ready for fast responses!` dans les logs.

- **Ollama ne répond plus après avoir annulé une génération** :
  
  Ollama ne peut pas interrompre une génération en cours. Cependant, grâce à `OLLAMA_NUM_PARALLEL=4`, vous pouvez envoyer de nouvelles requêtes pendant qu'une ancienne génération se termine en arrière-plan.

- **Les réponses annulées apparaissent quand même** :
  
  C'est un comportement attendu temporairement. Le backend ne sauvegarde pas les messages des générations annulées, mais si une génération termine avant que vous n'annuliez, elle sera sauvegardée.

- **Vérifier si Ollama fonctionne** :
  ```bash
  curl http://localhost:11434/api/tags
  curl http://localhost:11434/api/ps
  ```

### 8.4. Reset complet

Si vous avez des problèmes persistants :

```bash
# Arrêter et supprimer tous les conteneurs et volumes
docker-compose down -v

# Redémarrer proprement
docker-compose up -d

# Attendre que les modèles se téléchargent
docker logs -f electron-chat-ollama-init
```

Pour des détails plus fins sur les choix d'implémentation, consultez `MVP_PLAN.md` et `PHASE2_GUIDE.md` à la racine du projet.

