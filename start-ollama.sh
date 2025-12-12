#!/bin/bash
# Script pour démarrer Ollama avec le support du parallélisme
# Ceci permet d'envoyer de nouvelles requêtes même si une génération est en cours

# Configuration
export OLLAMA_NUM_PARALLEL=4        # Nombre de requêtes parallèles
export OLLAMA_MAX_LOADED_MODELS=2   # Nombre de modèles en mémoire

echo "Starting Ollama with parallel support..."
echo "  OLLAMA_NUM_PARALLEL = $OLLAMA_NUM_PARALLEL"
echo "  OLLAMA_MAX_LOADED_MODELS = $OLLAMA_MAX_LOADED_MODELS"
echo ""

# Démarrer Ollama
ollama serve

