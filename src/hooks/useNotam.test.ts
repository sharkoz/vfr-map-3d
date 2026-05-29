import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useNotam } from './useNotam'

vi.mock('@/db', () => ({
  loadNotam: vi.fn(),
  saveNotam: vi.fn(),
  isNotamFresh: vi.fn(),
}))

vi.mock('import.meta', () => ({
  env: { VITE_OPENAIP_API_KEY: 'test-key' },
}))

const mockNotamItems = [
  {
    id: 'A0001/26',
    text: 'NOTAM TEST - ZONE TEMPORAIRE ACTIVEE',
    location: 'LFFF',
    startTime: '2026-05-27T06:00:00Z',
    endTime: '2026-05-27T18:00:00Z',
  },
]

describe('useNotam', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('charge depuis IndexedDB si cache frais', async () => {
    const { loadNotam, isNotamFresh } = await import('@/db')
    vi.mocked(loadNotam).mockResolvedValue({
      data: mockNotamItems,
      fetchedAt: Date.now(),
    })
    vi.mocked(isNotamFresh).mockResolvedValue(true)

    const { result } = renderHook(() => useNotam('LFFF'))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.data?.items).toEqual(mockNotamItems)
    expect(result.current.data?.isFromCache).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('utilise le cache avec badge si réseau indisponible', async () => {
    const { loadNotam, isNotamFresh } = await import('@/db')
    const oldFetchedAt = Date.now() - 2 * 60 * 60 * 1000 // 2h ago, < 24h threshold
    vi.mocked(loadNotam).mockResolvedValue({
      data: mockNotamItems,
      fetchedAt: oldFetchedAt,
    })
    vi.mocked(isNotamFresh).mockResolvedValue(false)

    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useNotam('LFFF'))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.data?.isFromCache).toBe(true)
    expect(result.current.data?.items).toEqual(mockNotamItems)
  })

  it('marque le cache comme expiré après 24h', async () => {
    const { loadNotam, isNotamFresh } = await import('@/db')
    const expiredFetchedAt = Date.now() - 25 * 60 * 60 * 1000 // 25h ago
    vi.mocked(loadNotam).mockResolvedValue({
      data: mockNotamItems,
      fetchedAt: expiredFetchedAt,
    })
    vi.mocked(isNotamFresh).mockResolvedValue(false)

    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useNotam('LFFF'))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.data?.cacheExpired).toBe(true)
    expect(result.current.data?.isFromCache).toBe(true)
  })

  it('retourne une erreur si pas de cache et réseau indisponible', async () => {
    const { loadNotam, isNotamFresh } = await import('@/db')
    vi.mocked(loadNotam).mockResolvedValue(null)
    vi.mocked(isNotamFresh).mockResolvedValue(false)

    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useNotam('LFFF'))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).toBeTruthy()
    expect(result.current.data).toBeNull()
  })
})
