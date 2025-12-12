const { contextBridge, ipcRenderer } = require("electron");

function anyAbortSignal(signals) {
    // Filtrer les valeurs falsy ou non-objet pour éviter les erreurs de type
    const validSignals = (signals || []).filter((s) => s && typeof s === 'object');

    const controller = new AbortController();

    // Si aucun signal valide n'est fourni, retourner simplement le signal du controller
    if (validSignals.length === 0) {
        return controller.signal;
    }

    // Si l'un des signaux est déjà aborté, on propage immédiatement
    for (const signal of validSignals) {
        if (signal.aborted) {
            controller.abort(signal.reason);
            return controller.signal;
        }
    }

    const listeners = [];

    const cleanup = () => {
        for (const off of listeners) off();
        listeners.length = 0;
    };

    const abort = (event) => {
        const signal = event && event.target && typeof event.target === 'object'
            ? event.target
            : undefined;
        controller.abort(signal && 'reason' in signal ? signal.reason : undefined);
        cleanup();
    };

    for (const signal of validSignals) {
        // Vérifier que l'API d'événements existe bien avant de l'utiliser
        if (typeof signal.addEventListener !== 'function') {
            continue;
        }

        if (signal.aborted) {
            controller.abort(signal.reason);
            cleanup();
            return controller.signal;
        }

        const onAbort = (event) => abort(event);
        signal.addEventListener('abort', onAbort, { once: true });
        listeners.push(() => {
            if (typeof signal.removeEventListener === 'function') {
                signal.removeEventListener('abort', onAbort);
            }
        });
    }

    return controller.signal;
}

// Extract backend URL from process arguments
let backendUrl = "http://localhost:4000"; // default
const args = process.argv;
for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--backend-url=")) {
        backendUrl = args[i].split("=")[1];
        break;
    }
}

// Helper function for fetch requests
async function apiFetch(endpoint, options = {}) {
    try {
        const url = `${backendUrl}${endpoint}`;
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(error.error || `HTTP ${response.status}`);
        }

        // Handle 204 No Content responses (e.g., DELETE requests)
        if (response.status === 204) {
            return null;
        }

        // Check if response has content before parsing JSON
        const contentLength = response.headers.get('content-length');
        const contentType = response.headers.get('content-type');

        if (contentLength === '0' || !contentType?.includes('application/json')) {
            return null;
        }

        return await response.json();
    } catch (error) {
        console.error(`API fetch error for ${endpoint}:`, error);
        throw error;
    }
}

// Helper function for fetch requests with streaming
async function apiFetchStream(endpoint, options = {}, onChunk, signal) {
    const controller = new AbortController();

    // Si l'appelant ne fournit pas de signal ou fournit autre chose qu'un AbortSignal,
    // on ne compose pas, on utilise seulement le controller interne.
    const callerSignal = signal && typeof signal === 'object' && 'aborted' in signal
        ? signal
        : undefined;

    const combinedSignal = callerSignal
        ? anyAbortSignal([callerSignal, controller.signal])
        : controller.signal;

    const url = `${backendUrl}${endpoint}`;

    let response;
    try {
        response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
            signal: combinedSignal,
        });
    } catch (error) {
        if (error.name === 'AbortError') {
            // Connexion annulée avant même d'avoir une réponse
            console.log('[preload] Fetch aborted before response');
            onChunk({ type: 'aborted', partial: false });
            return;
        }
        throw error;
    }

    if (!response.ok || !response.body) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || `HTTP ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    let buffer = '';
    let aborted = false;

    // Écouter le signal abort pour annuler le reader
    const abortHandler = () => {
        console.log('[preload] Abort signal received, cancelling reader');
        aborted = true;
        reader.cancel('Aborted by user').catch(() => {});
    };

    if (combinedSignal.aborted) {
        // Déjà aborté
        console.log('[preload] Signal already aborted');
        await reader.cancel('Already aborted').catch(() => {});
        onChunk({ type: 'aborted', partial: false });
        return;
    }

    combinedSignal.addEventListener('abort', abortHandler, { once: true });

    try {
        while (true) {
            if (aborted) {
                console.log('[preload] Loop detected abort, breaking');
                break;
            }

            const { value, done } = await reader.read();

            if (aborted) {
                console.log('[preload] Read completed but aborted, breaking');
                break;
            }

            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            const parts = buffer.split(/\n\n/);
            buffer = parts.pop() || '';

            for (const part of parts) {
                if (aborted) break;
                const line = part.trim();
                if (!line.startsWith('data:')) continue;
                const jsonPart = line.replace(/^data:\s*/, '');
                try {
                    const event = JSON.parse(jsonPart);
                    onChunk(event);
                } catch (e) {
                    console.error('Failed to parse SSE chunk', e);
                }
            }
        }

        // Envoyer l'événement aborted si on a été interrompu
        if (aborted) {
            console.log('[preload] Sending aborted event to callback');
            onChunk({ type: 'aborted', partial: true });
        }
    } catch (error) {
        if (error.name === 'AbortError' || aborted) {
            console.log('[preload] Stream aborted (catch block)');
            onChunk({ type: 'aborted', partial: true });
            return;
        }
        throw error;
    } finally {
        combinedSignal.removeEventListener('abort', abortHandler);
    }
}

// Expose legacy electronApi (for jokes example)
contextBridge.exposeInMainWorld("electronApi", {
    ping: () => ipcRenderer.invoke("ping"),
    openFileDialog: () => ipcRenderer.invoke("dialog:openFile"),
    notifyJokeAdded: (joke) => ipcRenderer.invoke('jokes:notify-added', joke),
});

// Expose window controls API
contextBridge.exposeInMainWorld("windowApi", {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
    onStateChange: (callback) => {
        ipcRenderer.on('window-state-changed', (_event, state) => callback(state));
    },
});

// Expose new API for chat and profiles
contextBridge.exposeInMainWorld("api", {
    chat: {
        sendMessage: (payload) => apiFetch('/api/chat/send', {
            method: 'POST',
            body: JSON.stringify(payload),
        }),
        getSession: (id) => apiFetch(`/api/chat/session/${id}`),
        listSessions: (profileId) => {
            const endpoint = profileId 
                ? `/api/chat/sessions?profileId=${encodeURIComponent(profileId)}`
                : '/api/chat/sessions';
            return apiFetch(endpoint);
        },
        sendMessageStream: (payload, onEvent, abortSignal) => apiFetchStream('/api/chat/send-stream', {
            method: 'POST',
            body: JSON.stringify(payload),
        }, onEvent, abortSignal),
    },
    profile: {
        list: () => apiFetch('/api/profile'),
        create: (data) => apiFetch('/api/profile', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
        get: (id) => apiFetch(`/api/profile/${id}`),
        update: (id, data) => apiFetch(`/api/profile/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        }),
        delete: (id) => apiFetch(`/api/profile/${id}`, {
            method: 'DELETE',
        }),
    },
    rag: {
        uploadFiles: async (profileId, files) => {
            const formData = new FormData();
            for (const file of files) {
                formData.append('files', file);
            }
            const response = await fetch(`${backendUrl}/api/profile/${profileId}/resources/upload`, {
                method: 'POST',
                body: formData,
            });
            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: 'Unknown error' }));
                throw new Error(error.error || `HTTP ${response.status}`);
            }
            return await response.json();
        },
        addText: (profileId, data) => apiFetch(`/api/profile/${profileId}/resources/text`, {
            method: 'POST',
            body: JSON.stringify(data),
        }),
        listResources: (profileId) => apiFetch(`/api/profile/${profileId}/resources`),
        deleteResource: (profileId, resourceId) => apiFetch(`/api/profile/${profileId}/resources/${resourceId}`, {
            method: 'DELETE',
        }),
        startIndexing: (profileId) => apiFetch(`/api/profile/${profileId}/index`, {
            method: 'POST',
        }),
        getIndexingJob: (jobId) => apiFetch(`/api/indexing-jobs/${jobId}`),
        listIndexingJobs: (profileId) => apiFetch(`/api/profile/${profileId}/indexing-jobs`),
        search: (profileId, query, topK) => apiFetch(`/api/profile/${profileId}/rag/search`, {
            method: 'POST',
            body: JSON.stringify({ query, topK }),
        }),
    },
});
