#!/bin/sh
set -eu

# Configuration
MODEL_TAG="${OLLAMA_DEFAULT_MODEL:-llama3.1:8b}"
EMBED_MODEL_TAG="${OLLAMA_EMBED_MODEL:-nomic-embed-text}"
OLLAMA_HOST="${OLLAMA_HOST:-ollama:11434}"
MAX_WAIT_SECONDS="${OLLAMA_INIT_TIMEOUT:-120}"
VERIFY_DELAY="${OLLAMA_VERIFY_DELAY:-2}"
API_VERSION_ENDPOINT="/api/version"
API_TAGS_ENDPOINT="/api/tags"

echo "[ollama-init] Starting Ollama model initialization..."
echo "[ollama-init] Target LLM model: ${MODEL_TAG}"
echo "[ollama-init] Target embedding model: ${EMBED_MODEL_TAG}"
echo "[ollama-init] Ollama host: ${OLLAMA_HOST}"

# Construct the base URL for API calls
case "${OLLAMA_HOST}" in
  http://*|https://*)
    API_BASE_URL="${OLLAMA_HOST}"
    ;;
  *)
    API_BASE_URL="http://${OLLAMA_HOST}"
    ;;
esac

# Function to check if a model exists
check_model_exists() {
  model_name="$1"
  curl -sf "${API_BASE_URL}${API_TAGS_ENDPOINT}" | grep -q "\"name\":\"${model_name}\""
}

# Function to pull a model if needed
pull_model_if_needed() {
  model_name="$1"

  echo "[ollama-init] Checking if model '${model_name}' is available..."
  if check_model_exists "${model_name}"; then
    echo "[ollama-init] Model '${model_name}' is already available"
    return 0
  fi

  echo "[ollama-init] Model '${model_name}' not found in available models"
  echo "[ollama-init] Starting pull of model '${model_name}'..."
  echo "[ollama-init] This may take several minutes depending on model size and network speed..."

  if ollama pull "${model_name}"; then
    echo "[ollama-init] Successfully pulled model '${model_name}'"
    echo "[ollama-init] Verifying model availability..."
    sleep "${VERIFY_DELAY}"
    if check_model_exists "${model_name}"; then
      echo "[ollama-init] Model '${model_name}' verified in available models"
      return 0
    else
      echo "[ollama-init] WARNING: Model pull succeeded but model not found in tags"
      return 0
    fi
  else
    echo "[ollama-init] ERROR: Failed to pull model '${model_name}'"
    return 1
  fi
}

# Wait for Ollama API to be ready using the version endpoint
echo "[ollama-init] Waiting for Ollama API at ${OLLAMA_HOST}..."
wait_count=0
while ! curl -sf "${API_BASE_URL}${API_VERSION_ENDPOINT}" >/dev/null 2>&1; do
  if [ "$wait_count" -ge "$MAX_WAIT_SECONDS" ]; then
    echo "[ollama-init] ERROR: Ollama API did not become ready after ${MAX_WAIT_SECONDS} seconds"
    exit 1
  fi
  echo "[ollama-init] Waiting for Ollama API... (${wait_count}/${MAX_WAIT_SECONDS})"
  sleep 2
  wait_count=$((wait_count + 2))
done

echo "[ollama-init] Ollama API is ready!"

# Configure Ollama CLI to use the correct host
export OLLAMA_HOST="${API_BASE_URL}"

# Pull main LLM model (for chat)
pull_model_if_needed "${MODEL_TAG}"

# Pull embedding model (for RAG)
pull_model_if_needed "${EMBED_MODEL_TAG}"

echo "[ollama-init] Initialization complete!"
exit 0
