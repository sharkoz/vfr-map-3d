import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useAirspace } from './useAirspace'
import type { AirspaceCollection } from '@/types/airspace'

// Mock IndexedDB
vi.mock('@/db', () => ({
  loadAirspace: vi.fn(),
  saveAirspace: vi.fn(),
  isAirspaceFresh: vi.fn(() => true),
}))

// Mock store
vi.mock('@/store', () => ({
  useAppStore: vi.fn((selector) => {
    const state = { setAirspaceLoaded: vi.fn() }
    return selector(state)
  }),
}))

const mockCollection: AirspaceCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[[2.3, 48.8], [2.4, 48.8], [2.4, 48.9], [2.3, 48.9], [2.3, 48.8]]],
      },
      properties: {
        id: 'test-1',
        name: 'Test Zone',
        type: 'CTR',
        class: 'D',
        lowerLimit: { value: 0, unit: 'FT', reference: 'AGL' },
        upperLimit: { value: 2500, unit: 'FT', reference: 'AGL' },
        country: 'FR',
      },
    },
  ],
}

describe('useAirspace', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('charge depuis IndexedDB si disponible', async () => {
    const { loadAirspace, isAirspaceFresh } = await import('@/db')
    vi.mocked(loadAirspace).mockResolvedValue(mockCollection)
    vi.mocked(isAirspaceFresh).mockResolvedValue(true)

    const { result } = renderHook(() => useAirspace())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.data).toEqual(mockCollection)
    expect(result.current.error).toBeNull()
  })

  it('charge depuis le fichier bundlé si IndexedDB vide', async () => {
    const { loadAirspace, saveAirspace } = await import('@/db')
    vi.mocked(loadAirspace).mockResolvedValue(null)
    vi.mocked(saveAirspace).mockResolvedValue(undefined)

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockCollection,
    } as Response)

    const { result } = renderHook(() => useAirspace())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.data).toEqual(mockCollection)
    expect(saveAirspace).toHaveBeenCalledWith(mockCollection)
  })

  it('retourne une erreur si fetch échoue et IndexedDB vide', async () => {
    const { loadAirspace } = await import('@/db')
    vi.mocked(loadAirspace).mockResolvedValue(null)

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    } as Response)

    const { result } = renderHook(() => useAirspace())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).toBeTruthy()
    expect(result.current.data).toBeNull()
  })

  it('commence avec loading=true', async () => {
    const { loadAirspace } = vi.mocked(await import('@/db'))
    loadAirspace.mockImplementation(() => new Promise(() => {})) // never resolves

    const { result } = renderHook(() => useAirspace())
    expect(result.current.loading).toBe(true)
  })
})
