# Packaging Chatbot Maker (Windows offline)

Ce document décrit comment construire l'installeur Windows (.exe) tout-en-un.

## 1. Préparer les données Docker (machine de build)

```powershell
cd C:\JetbrainWorkplaces\Intellij\chatbot_maker

# Lancer la stack runtime pour initialiser Postgres, Qdrant, Ollama
docker compose -f docker\docker-compose.runtime.yml up -d

# Télécharger les modèles Ollama nécessaires
# Exemple :
docker exec -it electron-chat-ollama ollama pull llama3.1:8b
# docker exec -it electron-chat-ollama ollama pull nomic-embed-text

# Arrêter la stack
docker compose -f docker\docker-compose.runtime.yml down
```

À ce stade, le dossier `docker/data` contient les données et modèles à packager.

## 2. Construire renderer et backend

```powershell
cd C:\JetbrainWorkplaces\Intellij\chatbot_maker
npm install
cd backend; npm install; cd ..
cd renderer; npm install; cd ..

npm run build:all
```

Cela va :
- construire le frontend (`renderer/dist`),
- construire le backend (`backend/dist`),
- copier `docker/docker-compose.runtime.yml` et `docker/data` vers `build/docker`.

## 3. Générer l'installeur Electron (NSIS)

```powershell
cd C:\JetbrainWorkplaces\Intellij\chatbot_maker
npm run dist
```

Cela utilise `electron-builder` pour produire un installeur Windows dans `dist_electron`.

## 4. Comportement de l'application packagée

- À l'installation, les ressources `docker` et `scripts` sont copiées dans le dossier d'installation.
- Au lancement en production, `electron/main.js` :
  - exécute `scripts/start-stack.ps1` pour démarrer la stack Docker à partir de `docker/docker-compose.yml`,
  - attend que le backend réponde sur `BACKEND_URL/health` (configuré par défaut sur `http://localhost:4000`),
  - charge ensuite l'UI packagée (`renderer/dist/index.html`).

Assurez-vous que votre backend expose un endpoint `/health` et utilise les mêmes ports que ceux définis dans `docker-compose.runtime.yml`.

