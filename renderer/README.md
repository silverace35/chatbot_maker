# Renderer React + Vite + TypeScript

Cette application utilise Vite + React + TypeScript avec une architecture orientée "features" via le dossier `modules/`.

## Structure générale

- `modules/` : fonctionnalités métier (features)
    - `chat/`
        - `pages/`
            - `ChatPage.tsx` : page principale de la conversation avec le LLM.
        - `components/`
            - `ChatMessages/` : liste des messages (user/assistant) avec rendu Markdown.
            - `ChatInput/` : zone de saisie et envoi des messages.
            - `ProfileSelector/` : sélection rapide d’un profil de chat.
            - `ProfileDialog/` : création/édition d’un profil (nom, contexte système, etc.).
    - `shared/`
        - `components/` : futurs composants transverses réutilisables.

- `services/` : couche métier / données (API, stockage, etc.)
    - `chat/`
        - `chat.service.ts` : service d’envoi de messages, récupération de sessions, streaming.
        - `chat.service.types.ts` : types spécifiques au service de chat (payloads, réponses, messages, événements de stream, etc.).
    - `profile/`
        - `profile.service.ts` : service de gestion des profils (CRUD profils).
        - `profile.service.types.ts` : types spécifiques aux profils (DTO, payloads, etc.).
    - `llm/` (réservé aux intégrations LLM côté front si nécessaire).

- `shared/` : éléments génériques et réutilisables (via `modules/shared` ou futurs dossiers dédiés)
    - `components/` : futurs composants transverses (ex : `ActionMenu/ActionMenu.tsx`…)

- `config/` : configuration applicative (ex. `appConfig.js`).
- `types/` : types globaux (par ex. `electron-api.d.ts` pour `window.api`).

## Principes d'architecture

1. **Composants auto-contenus**

Chaque composant vit dans son propre dossier qui regroupe :

- le composant (`*.tsx`),
- ses styles (`*.styles.ts` ou `*.module.css`),
- ses types (`*.types.ts`),
- ses tests (`*.test.tsx`).

Exemple attendu :

```text
ChatMessages/
  ChatMessages.tsx
  ChatMessages.types.ts
  ChatMessages.styles.ts
  ChatMessages.test.tsx
```

2. **Services séparés de la UI**

Les services sont rassemblés dans `services/` et ne dépendent jamais des composants. Ils :

- exposent la logique métier (ex : `sendMessage`, `sendMessageStream`, `listProfiles`, …),
- définissent leurs propres types (DTO, payloads, modèles de données consommés par l’UI),
- disposent de leurs tests dédiés dans `services/<domaine>/tests` (à ajouter progressivement).

Exemple :

```text
services/
  chat/
    chat.service.ts
    chat.service.types.ts
    chat.service.test.ts
  profile/
    profile.service.ts
    profile.service.types.ts
    profile.service.test.ts
```

3. **Modules vs Shared**

- `modules/*` regroupe tout ce qui est spécifique à un domaine fonctionnel (pages, composants de feature, hooks dédiés, etc.).
- `modules/shared/*` contient les briques UI et utilitaires réutilisables partout (boutons, menus, hooks outils, helpers…).

4. **Flux typique**

- une page (ex. `ChatPage`) appelle des services (`chat.service`, `profile.service`) pour récupérer ou envoyer des données,
- les services interagissent avec la source de données (backend Electron/Express via `window.api`, etc.),
- la page passe ces données typées aux composants (`ChatMessages`, `ProfileSelector`, `ChatInput`),
- les tests valident séparément :
    - le rendu/interactions des composants,
    - la logique métier des services.

Cette organisation vise à :

- faciliter la navigation dans le code,
- encourager la réutilisation des composants et services,
- garder une séparation claire entre UI (React/MUI) et logique métier (services, types).
