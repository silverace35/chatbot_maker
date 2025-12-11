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
    const response = await fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
        signal: combinedSignal,
    });

    if (!response.ok || !response.body) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || `HTTP ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    let buffer = '';

    try {
        while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            const parts = buffer.split(/\n\n/);
            buffer = parts.pop() || '';

            for (const part of parts) {
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
    } catch (error) {
        if (error.name === 'AbortError') {
            // Stream cancelled, just stop quietly
            return;
        }
        throw error;
    }
}

// Expose legacy electronApi (for jokes example)
contextBridge.exposeInMainWorld("electronApi", {
    ping: () => ipcRenderer.invoke("ping"),
    openFileDialog: () => ipcRenderer.invoke("dialog:openFile"),
    notifyJokeAdded: (joke) => ipcRenderer.invoke('jokes:notify-added', joke),
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
