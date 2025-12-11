import { describe, it, expect } from 'vitest'
import { chunkingService } from './chunkingService'

describe('chunkingService.chunkText', () => {
  it('retourne [] si texte vide', () => {
    const chunks = chunkingService.chunkText('')
    expect(chunks).toEqual([])
  })

  it('retourne un seul chunk si texte plus court que chunkSize', () => {
    const text = 'Petit texte'
    const chunks = chunkingService.chunkText(text, { chunkSize: 1000 })
    expect(chunks).toHaveLength(1)
    expect(chunks[0].content).toBe(text)
    expect(chunks[0].index).toBe(0)
    expect(chunks[0].metadata?.originalLength).toBe(text.length)
  })

  it('produit plusieurs chunks avec overlap cohérent', () => {
    const text = 'A'.repeat(1000)
    const chunks = chunkingService.chunkText(text, { chunkSize: 200, chunkOverlap: 50 })
    expect(chunks.length).toBeGreaterThan(1)
  })
})

describe('chunkingService.cleanText', () => {
  it('normalise les retours chariot, tabs et sauts de ligne', () => {
    const raw = '\r\nLine1\r\n\r\n\r\nLine2\tEnd'
    const cleaned = chunkingService.cleanText(raw)
    expect(cleaned).toBe('Line1\n\nLine2  End')
  })
})

describe('chunkingService.extractText', () => {
  it('gère les text/plain', () => {
    const input = Buffer.from('Hello')
    const result = chunkingService.extractText(input, 'text/plain')
    expect(result).toBe('Hello')
  })

  it('gère les JSON valides', () => {
    const input = Buffer.from('{"a":1}')
    const result = chunkingService.extractText(input, 'application/json')
    expect(result).toContain('"a": 1')
  })
})

