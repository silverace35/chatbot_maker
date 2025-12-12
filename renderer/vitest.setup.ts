import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

// Mock pour scrollTo qui n'existe pas dans JSDOM
Element.prototype.scrollTo = vi.fn()
window.scrollTo = vi.fn()

declare global {
  interface Window {
    api: typeof apiMock
  }
}

// Mock global de window.api pour tous les tests frontend afin d'éviter tout appel réel vers la BDD / Electron

const apiMock = {
  chat: {
    sendMessage: vi.fn(),
    sendMessageStream: vi.fn(),
    getSession: vi.fn(),
    listSessions: vi.fn().mockResolvedValue({ sessions: [] }),
  },
  profile: {
    list: vi.fn().mockResolvedValue({ profiles: [] }),
    create: vi.fn(),
    get: vi.fn(),
    update: vi.fn(),
  },
  rag: {
    uploadFiles: vi.fn(),
    addText: vi.fn(),
    listResources: vi.fn().mockResolvedValue({ resources: [] }),
    deleteResource: vi.fn(),
    startIndexing: vi.fn(),
    getIndexingJob: vi.fn(),
    listIndexingJobs: vi.fn().mockResolvedValue({ jobs: [] }),
    search: vi.fn().mockResolvedValue({ results: [] }),
  },
}

window.api = apiMock
