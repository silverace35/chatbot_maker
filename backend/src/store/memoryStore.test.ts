import { describe, it, expect } from 'vitest'
import { memoryStore } from './memoryStore'

describe('memoryStore profiles', () => {
  it('crée et retourne un profil', async () => {
    const created = await memoryStore.createProfile({
      name: 'Test',
      description: 'desc',
      system_context: 'ctx',
      ragEnabled: true,
      embeddingModelId: 'model-1',
      ragSettings: { topK: 3, similarityThreshold: 0.8 },
    })

    expect(created.id).toMatch(/^profile_/)
    const fetched = await memoryStore.getProfile(created.id)
    expect(fetched).toBeDefined()
    expect(fetched!.name).toBe('Test')
  })
})

describe('memoryStore indexing jobs', () => {
  it('met à jour la progression d’un job', async () => {
    const job = await memoryStore.createIndexingJob({
      profileId: 'p1',
      totalSteps: 10,
    })

    const updated = await memoryStore.updateIndexingJob(job.id, {
      processedSteps: 5,
      status: 'processing',
    })

    expect(updated).toBeDefined()
    expect(updated!.progress).toBe(50)
    expect(updated!.status).toBe('processing')
  })
})
