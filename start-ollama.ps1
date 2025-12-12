# Script pour démarrer Ollama avec le support du parallélisme
# Ceci permet d'envoyer de nouvelles requêtes même si une génération est en cours

# Configuration
$env:OLLAMA_NUM_PARALLEL = "4"        # Nombre de requêtes parallèles
$env:OLLAMA_MAX_LOADED_MODELS = "2"   # Nombre de modèles en mémoire

Write-Host "Starting Ollama with parallel support..."
Write-Host "  OLLAMA_NUM_PARALLEL = $env:OLLAMA_NUM_PARALLEL"
Write-Host "  OLLAMA_MAX_LOADED_MODELS = $env:OLLAMA_MAX_LOADED_MODELS"
Write-Host ""

# Démarrer Ollama
ollama serve

