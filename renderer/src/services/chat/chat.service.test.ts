import { describe, it, expect, vi, beforeEach } from 'vitest'
import { chatService } from './chat.service'
import type { SendMessagePayload, SendMessageResponse, ChatSession } from './chat.service.types'

describe('chatService', () => {
  beforeEach(() => {
    window.api = {
      chat: {
        sendMessage: vi.fn().mockResolvedValue({} as SendMessageResponse),
        getSession: vi.fn().mockResolvedValue({ id: 's1' } as ChatSession),
        listSessions: vi.fn().mockResolvedValue({ sessions: [] }),
        sendMessageStream: vi.fn().mockResolvedValue(undefined),
      },
      profile: {
        list: vi.fn(),
        create: vi.fn(),
        get: vi.fn(),
        update: vi.fn(),
      },
      rag: {
        uploadFiles: vi.fn(),
        addText: vi.fn(),
        listResources: vi.fn(),
        deleteResource: vi.fn(),
        startIndexing: vi.fn(),
        getIndexingJob: vi.fn(),
        listIndexingJobs: vi.fn(),
        search: vi.fn(),
      },
    } as any
  })

  it('lance une erreur si Chat API indisponible', async () => {
    // @ts-expect-error for test we simulate absence of chat API
    window.api.chat = undefined
    const payload: SendMessagePayload = { profileId: 'p1', message: 'Hello' } as SendMessagePayload
    await expect(chatService.sendMessage(payload)).rejects.toThrow('Chat API not available')
  })

  it('appelle window.api.chat.sendMessage', async () => {
    const payload: SendMessagePayload = { profileId: 'p1', message: 'Hello' } as SendMessagePayload
    await chatService.sendMessage(payload)
    expect(window.api.chat.sendMessage).toHaveBeenCalledWith(payload)
  })

  it('retourne les sessions depuis listSessions', async () => {
    ;(window.api.chat.listSessions as any).mockResolvedValue({ sessions: [{ id: 's1' } as ChatSession] })
    const sessions = await chatService.listSessions()
    expect(sessions).toHaveLength(1)
    expect(sessions[0].id).toBe('s1')
  })

  it('sendMessageStream crée un handle avec stop()', () => {
    const handle = chatService.sendMessageStream(
      { profileId: 'p1', message: 'Hello' } as SendMessagePayload,
      () => {},
    )
    expect(typeof handle.stop).toBe('function')
  })
})
