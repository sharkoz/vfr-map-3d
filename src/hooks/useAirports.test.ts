import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useAirports } from './useAirports'
import type { AirportCollection } from '@/types/airport'

const mockAirportData: AirportCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [2.441, 48.969] },
      properties: {
        id: 'lfpb',
        name: 'PARIS LE BOURGET',
        icaoCode: 'LFPB',
        iataCode: 'LBG',
        type: 'AIRPORT',
        elevation: 218,
        frequencies: [],
        runways: [],
        country: 'FR',
      },
    },
  ],
}

describe('useAirports', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('retourne les données après un fetch réussi', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockAirportData,
    } as Response)

    const { result } = renderHook(() => useAirports())

    expect(result.current.loading).toBe(true)

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.data).toEqual(mockAirportData)
    expect(result.current.error).toBeNull()
  })

  it('retourne une erreur si fetch échoue', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    } as Response)

    const { result } = renderHook(() => useAirports())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.data).toBeNull()
    expect(result.current.error).toContain('404')
  })

  it('gère un fetch rejetant avec une exception', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Réseau indisponible'))

    const { result } = renderHook(() => useAirports())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.data).toBeNull()
    expect(result.current.error).toBe('Réseau indisponible')
  })
})
