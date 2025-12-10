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
- LLM : Ollama (modèle local) avec fallback stub si nécessaire
- RAG / Embeddings : service d'embedding basé sur Ollama, vector store en mémoire (Qdrant a venir)
- Base de données : PostgreSQL (optionnel, en mémoire par défaut)
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

Quelques pistes de diagnostic courantes :

- Le backend ne répond pas :
  - vérifier que le serveur est bien lancé ;
  - tester `http://localhost:4000/health` dans un navigateur ou avec `curl` ;
  - vérifier que le port 4000 n’est pas déjà utilisé.

- Le frontend/Electron ne peut pas appeler l’API :
  - vérifier la console des DevTools Electron ;
  - vérifier que `window.api` est défini ;
  - vérifier l’URL backend passée à Electron le cas échéant (`--backend-url=`).

- Messages d’erreur "API not available" dans l’interface :
  - le preload n’a pas exposé correctement l’API ;
  - redémarrer l’application Electron après avoir vérifié la configuration.

Pour des détails plus fins sur les choix d’implémentation, consultez `MVP_PLAN.md` et `PHASE2_GUIDE.md` à la racine du projet.
