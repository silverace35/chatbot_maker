# Document de Présentation - ChatBot Maker

> **Application desktop Electron + React permettant de créer et interagir avec des chatbots personnalisés alimentés par un LLM local (Ollama).**

---

## Table des matières

1. [Sécurité dans Electron](#4-sécurité-dans-electron)
2. [Base de données & Stockage](#5-base-de-données--stockage)
3. [CI/CD & Qualité du projet](#6-cicd--qualité-du-projet)
4. [Questions-Réponses](#questions-réponses-préparées)

---

## 4. Sécurité dans Electron

### Options de Sécurité Configurées

Notre application utilise les trois piliers de sécurité Electron :

| Option | Valeur | Fichier | Justification |
|--------|--------|---------|---------------|
| `contextIsolation` | `true` | `electron/main.js` | Isole le contexte JavaScript du preload de celui du renderer. Le code de la page web ne peut pas accéder aux objets du preload. |
| `sandbox` | `true` | `electron/main.js` | Confine le renderer dans un bac à sable Chromium avec permissions restreintes. Même si du code malveillant s'exécute, il ne peut pas accéder au système. |
| `nodeIntegration` | `false` | `electron/main.js` | Désactive `require()`, `process`, `Buffer` dans le renderer. Protège contre les attaques XSS qui tenteraient d'exécuter du code Node.js. |

#### Pourquoi ces choix ?

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        SANS PROTECTION                                   │
│  Renderer (page web)                                                     │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ <script>                                                         │    │
│  │   require('child_process').exec('rm -rf /');  // ❌ DANGEREUX   │    │
│  │   require('fs').readFileSync('/etc/passwd');  // ❌ DANGEREUX   │    │
│  │ </script>                                                        │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                        AVEC PROTECTION                                   │
│  Renderer (page web)                                                     │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ <script>                                                         │    │
│  │   require('fs');  // ❌ ReferenceError: require is not defined  │    │
│  │   window.api.chat.send('message');  // ✅ Seule API autorisée   │    │
│  │ </script>                                                        │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
```

### Exposition d'API limitées dans `preload.js`

Le preload expose uniquement les fonctions métier nécessaires via `contextBridge` :

```javascript
// electron/preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // API Chat - Seules ces méthodes sont accessibles
  chat: {
    send: (profileId, message, sessionId) => 
      fetch(`${BACKEND_URL}/api/chat`, { /* ... */ }),
    getSession: (sessionId) => 
      fetch(`${BACKEND_URL}/api/chat/session/${sessionId}`),
    getSessions: () => 
      fetch(`${BACKEND_URL}/api/chat/sessions`),
  },
  
  // API Profils
  profile: {
    getAll: () => fetch(`${BACKEND_URL}/api/profile`),
    create: (data) => fetch(`${BACKEND_URL}/api/profile`, { method: 'POST', body: data }),
    // ...
  },
  
  // ❌ PAS D'ACCÈS À :
  // - fs (système de fichiers)
  // - child_process (exécution de commandes)
  // - os (informations système)
});
```

**Justification :** 
- Le renderer ne peut appeler que des fonctions explicitement exposées
- Chaque fonction est une opération métier spécifique (pas d'accès générique)
- Même si du code malveillant s'injecte dans la page, il ne peut pas compromettre le système

### Validation de données côté Backend

Toutes les entrées sont validées avant traitement :

```typescript
// backend/src/routes/chatRoutes.ts
router.post('/chat', async (req, res) => {
  const { profileId, message, sessionId } = req.body;
  
  // Validation des entrées
  if (!profileId || typeof profileId !== 'string') {
    return res.status(400).json({ error: 'profileId invalide' });
  }
  if (!message || typeof message !== 'string' || message.length > 10000) {
    return res.status(400).json({ error: 'message invalide' });
  }
  
  // Requêtes paramétrées pour éviter l'injection SQL
  const session = await db.query(
    'SELECT * FROM chat_sessions WHERE id = $1',
    [sessionId]  // ✅ Paramètre échappé automatiquement
  );
});
```

**Justification :**
- Le backend est la dernière ligne de défense
- Principe de défense en profondeur : ne jamais faire confiance aux données du client
- Requêtes paramétrées contre l'injection SQL

---

## 5. Base de données & Stockage

### Architecture de stockage

```
┌─────────────────────────────────────────────────────────────────┐
│                         PostgreSQL                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  profiles   │  │chat_sessions│  │       messages          │  │
│  │  resources  │  │indexing_jobs│  │   resource_chunks       │  │
│  └─────────────┘  └─────────────┘  │   resource_embeddings   │  │
│                                     └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              +
┌─────────────────────────────────────────────────────────────────┐
│                          Qdrant                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              Vecteurs d'embeddings (768d)                │    │
│  │              Recherche par similarité                    │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### Structure des tables principales

```sql
-- Table des profils de chatbot
CREATE TABLE profiles (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    system_context TEXT NOT NULL,
    rag_enabled BOOLEAN DEFAULT FALSE,
    embedding_model_id VARCHAR(255),
    rag_settings JSONB DEFAULT '{"topK": 5, "similarityThreshold": 0.7}',
    index_status VARCHAR(50) DEFAULT 'none' 
        CHECK (index_status IN ('none', 'pending', 'processing', 'ready', 'stale', 'error')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des sessions de chat
CREATE TABLE chat_sessions (
    id VARCHAR(255) PRIMARY KEY,
    profile_id VARCHAR(255) NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des messages
CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des ressources RAG
CREATE TABLE resources (
    id VARCHAR(255) PRIMARY KEY,
    profile_id VARCHAR(255) NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('file', 'text')),
    original_name VARCHAR(255),
    content_path VARCHAR(500),
    mime_type VARCHAR(100),
    size_bytes INTEGER,
    indexed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Requêtes principales

| Opération | Requête SQL |
|-----------|-------------|
| **Créer un profil** | `INSERT INTO profiles (id, name, system_context) VALUES ($1, $2, $3)` |
| **Lister les profils** | `SELECT * FROM profiles ORDER BY created_at DESC` |
| **Créer une session** | `INSERT INTO chat_sessions (id, profile_id) VALUES ($1, $2)` |
| **Ajouter un message** | `INSERT INTO messages (session_id, role, content) VALUES ($1, $2, $3)` |
| **Charger historique** | `SELECT * FROM messages WHERE session_id = $1 ORDER BY timestamp ASC` |
| **Supprimer session** | `DELETE FROM chat_sessions WHERE id = $1` (cascade sur messages) |

### Gestion des erreurs

```typescript
// backend/src/store/postgresStore.ts
async function executeQuery(query: string, params: any[]) {
  try {
    const result = await pool.query(query, params);
    return result.rows;
  } catch (error) {
    // Log détaillé pour debugging
    logger.error('Database error', {
      query: query.substring(0, 100),
      error: error.message,
      code: error.code
    });
    
    // Gestion des erreurs spécifiques
    if (error.code === '23505') { // Unique violation
      throw new AppError('Cet élément existe déjà', 409);
    }
    if (error.code === '23503') { // Foreign key violation
      throw new AppError('Référence invalide', 400);
    }
    
    throw new AppError('Erreur de base de données', 500);
  }
}
```

---

## 6. CI/CD & Qualité du projet

### Pipeline de qualité

```
┌───────────────┐    ┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│   Lint HTML   │ -> │   Lint JS     │ -> │  Tests Jest   │ -> │    Build      │
│  (htmlhint)   │    │   (ESLint)    │    │   (Vitest)    │    │               │
└───────────────┘    └───────────────┘    └───────────────┘    └───────────────┘
        │                    │                    │                    │
        v                    v                    v                    v
   Validation           Qualité du          Couverture           Packaging
   structure            code TS/JS          fonctionnelle        multiplateforme
```

### Configuration ESLint

```javascript
// renderer/eslint.config.js
export default [
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true }
      }
    },
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
      '@typescript-eslint': tsPlugin
    },
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'warn',
      'react/react-in-jsx-scope': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn'
    }
  }
];
```

### Tests unitaires avec Vitest

```typescript
// renderer/src/App.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

describe('App', () => {
  it('renders without crashing', () => {
    render(<App />);
    expect(screen.getByRole('main')).toBeInTheDocument();
  });
});

// backend/src/services/__tests__/llmService.test.ts
describe('LLM Service', () => {
  it('should format prompt correctly', () => {
    const prompt = formatPrompt('Hello', { systemContext: 'You are helpful' });
    expect(prompt).toContain('You are helpful');
    expect(prompt).toContain('Hello');
  });
});
```

**Pourquoi tester avec une DB en mémoire ?**
- Isolation complète entre tests (pas d'état partagé)
- Pas de fichiers résiduels après les tests
- Exécution beaucoup plus rapide
- Chaque test démarre avec un état propre

### Workflow GitHub Actions

```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
    tags: ['v*.*.*']
  pull_request:
    branches: [main]

jobs:
  # Job 1: Qualité du code
  lint-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: |
          npm ci
          cd renderer && npm ci
          cd ../backend && npm ci
      
      - name: Lint
        run: |
          cd renderer && npm run lint
          cd ../backend && npm run lint
      
      - name: Test
        run: |
          cd renderer && npm test
          cd ../backend && npm test

  # Job 2: Build et Release (sur tag uniquement)
  release:
    needs: lint-and-test
    if: startsWith(github.ref, 'refs/tags/v')
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [windows-latest, macos-latest, ubuntu-latest]
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
      
      - name: Install & Build
        run: |
          npm ci
          npm run build
      
      - name: Package Electron
        run: npm run package
      
      - name: Upload Release
        uses: softprops/action-gh-release@v1
        with:
          files: |
            dist_electron/*.exe
            dist_electron/*.dmg
            dist_electron/*.AppImage
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Packaging avec Electron Builder

```json
// package.json
{
  "build": {
    "appId": "com.chatbotmaker.app",
    "productName": "ChatBot Maker",
    "directories": {
      "output": "dist_electron"
    },
    "files": [
      "electron/**/*",
      "renderer/dist/**/*",
      "backend/dist/**/*"
    ],
    "win": {
      "target": "nsis",
      "icon": "assets/icon.ico"
    },
    "mac": {
      "target": "dmg",
      "icon": "assets/icon.icns"
    },
    "linux": {
      "target": "AppImage",
      "icon": "assets/icon.png"
    }
  }
}
```

**Pourquoi ces paramètres ?**
- `nsis` (Windows) : Installateur standard Windows, gère les mises à jour
- `dmg` (macOS) : Format natif macOS, drag-and-drop installation
- `AppImage` (Linux) : Portable, fonctionne sur toutes les distributions

### Release automatique via tag

```bash
# Créer une release
git tag v1.0.0
git push origin v1.0.0

# → Déclenche automatiquement :
# 1. Lint + Tests
# 2. Build sur Windows, macOS, Linux
# 3. Upload des binaires sur GitHub Releases
```

---

## Questions-Réponses Préparées

### Compréhension technique

**Q: Pourquoi utiliser un preload ?**
> Le preload est le seul moyen sécurisé d'exposer des APIs au renderer avec `contextIsolation: true`. Il agit comme un filtre qui n'expose que les fonctions métier nécessaires, jamais les APIs système dangereuses comme `fs` ou `child_process`.

**Q: Que se passe-t-il si deux IPC se déclenchent en même temps ?**
> Electron et Node.js gèrent les IPC de manière asynchrone via l'event loop. Chaque `ipcRenderer.invoke()` retourne une Promise indépendante. Côté backend, Express gère les requêtes concurrentes, et PostgreSQL assure l'intégrité des données avec les transactions.

**Q: Comment sécuriser davantage votre app ?**
> - Content Security Policy (CSP) strict dans les headers
> - Validation des URLs avant toute navigation (`will-navigate` event)
> - Désactivation de `allowRunningInsecureContent`
> - Audit régulier des dépendances npm (`npm audit`)
> - Rate limiting sur les APIs sensibles

**Q: Comment gérer la corruption de la base de données ?**
> - PostgreSQL a un système de WAL (Write-Ahead Logging) qui protège contre la corruption
> - Backups automatiques via pg_dump
> - Healthchecks Docker qui redémarrent les services défaillants
> - Mode `STORE_MODE=memory` comme fallback pour le développement

---

### Architecture

**Q: Différence entre main et renderer en termes de sécurité ?**
> - **Main** : Accès complet au système (Node.js), code de confiance, gère les fenêtres et l'IPC
> - **Renderer** : Environnement sandbox, pas d'accès Node.js, considéré comme non fiable (peut charger du contenu externe)

**Q: Pourquoi ne pas exposer directement `fs` ?**
> Exposer `fs` permettrait à n'importe quel code dans le renderer de lire/écrire tous les fichiers du système. Une vulnérabilité XSS pourrait alors voler des données sensibles ou installer des malwares. On expose uniquement des fonctions métier validées.

**Q: Comment organiser une deuxième fenêtre ?**
> ```javascript
> // Dans main.js
> const settingsWindow = new BrowserWindow({
>   parent: mainWindow,  // Fenêtre modale optionnelle
>   webPreferences: {
>     preload: path.join(__dirname, 'preload-settings.js'),
>     contextIsolation: true
>   }
> });
> // Communication via IPC, jamais directement entre fenêtres
> ```

---

### Choix dans le projet

**Q: Pourquoi PostgreSQL plutôt que SQLite ?**
> - Support natif de JSONB pour les configurations flexibles (rag_settings, metadata)
> - Meilleure gestion de la concurrence (plusieurs connexions simultanées)
> - Requêtes paramétrées natives pour la sécurité
> - Facilité de déploiement via Docker
> - Option `STORE_MODE=memory` disponible pour le développement léger

**Q: Pourquoi ces paramètres dans Electron Builder ?**
> - `nsis` : Standard Windows, gère les mises à jour automatiques
> - `dmg` : Expérience native macOS attendue par les utilisateurs
> - `AppImage` : Portable Linux, pas de dépendances système
> - `files` : Inclut uniquement les builds de production (pas les sources)

**Q: Comment organiseriez-vous votre projet en production ?**
> - Backend déployé séparément (Docker/Kubernetes) pour les mises à jour indépendantes
> - Electron connecté au backend via HTTPS
> - Variables d'environnement pour les URLs de production
> - Mise à jour automatique via `electron-updater`
> - Monitoring et logging centralisé

---

### Tests & CI/CD

**Q: Pourquoi tester avec une DB en mémoire ?**
> - **Isolation** : Chaque test a son propre état, pas d'interférences
> - **Rapidité** : Pas d'I/O disque, exécution instantanée
> - **Reproductibilité** : Même résultat à chaque exécution
> - **CI-friendly** : Pas de configuration de base de données sur le runner

**Q: Comment valider un IPC via Jest/Vitest ?**
> ```typescript
> // Mock de ipcRenderer
> vi.mock('electron', () => ({
>   ipcRenderer: {
>     invoke: vi.fn().mockResolvedValue({ success: true })
>   }
> }));
> 
> test('should send message via IPC', async () => {
>   const result = await window.api.chat.send('profile1', 'Hello');
>   expect(result.success).toBe(true);
> });
> ```

---

### Évolutions futures

| Évolution | Description | Complexité |
|-----------|-------------|------------|
| **Support multilingue** | i18n avec détection automatique de langue | Moyenne |
| **Export conversations** | PDF, Markdown, JSON | Faible |
| **Thèmes personnalisés** | Éditeur de thème utilisateur | Moyenne |
| **Synchronisation cloud** | Backup des profils et conversations | Élevée |
| **Plugins** | Architecture extensible pour intégrations tierces | Élevée |
| **Déploiement multiplateforme** | Optimisation ARM pour Mac M1/M2 | Moyenne |

### Refactor possible

- Migration vers Electron Forge pour une meilleure gestion du build
- Séparation du backend en microservices (chat, RAG, profils)
- Utilisation de tRPC pour le typage end-to-end
- Migration vers une architecture événementielle avec Redis

---

## Diagramme de Séquence

> Voir le fichier [`ChatBot Maker Sequence.svg`](./ChatBot%20Maker%20Sequence.svg) pour le diagramme complet des interactions.

```
Utilisateur → Frontend React → Preload (contextBridge) → Backend Express → Ollama/PostgreSQL
     ↑                                                                            │
     └────────────────────── Streaming SSE ←──────────────────────────────────────┘
```

