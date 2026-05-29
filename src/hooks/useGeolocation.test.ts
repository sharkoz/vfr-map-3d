import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useGeolocation } from './useGeolocation'

// Mock du store Zustand
vi.mock('@/store', () => ({
  useAppStore: vi.fn((selector) => {
    const state = { setUserPosition: vi.fn(), setGpsMotion: vi.fn() }
    return selector(state)
  }),
}))

const mockPosition: GeolocationPosition = {
  coords: {
    latitude: 48.8566,
    longitude: 2.3522,
    accuracy: 10,
    altitude: null,
    altitudeAccuracy: null,
    heading: null,
    speed: null,
  },
  timestamp: Date.now(),
}

describe('useGeolocation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retourne les états initiaux (loading=false, error=null, position=null)', () => {
    // Mock sans geolocation
    Object.defineProperty(global.navigator, 'geolocation', {
      value: {
        getCurrentPosition: vi.fn(),
        watchPosition: vi.fn(() => 1),
        clearWatch: vi.fn(),
      },
      writable: true,
    })

    const { result } = renderHook(() => useGeolocation())
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
    expect(result.current.position).toBeNull()
  })

  it('passe loading=true lors de la demande de position', () => {
    Object.defineProperty(global.navigator, 'geolocation', {
      value: {
        getCurrentPosition: vi.fn(),
        watchPosition: vi.fn(() => 1),
        clearWatch: vi.fn(),
      },
      writable: true,
    })

    const { result } = renderHook(() => useGeolocation())

    act(() => {
      result.current.requestPosition()
    })

    expect(result.current.loading).toBe(true)
  })

  it('retourne la position après succès', async () => {
    Object.defineProperty(global.navigator, 'geolocation', {
      value: {
        getCurrentPosition: vi.fn((success) => success(mockPosition)),
        watchPosition: vi.fn(() => 1),
        clearWatch: vi.fn(),
      },
      writable: true,
    })

    const { result } = renderHook(() => useGeolocation())

    await act(async () => {
      result.current.requestPosition()
    })

    expect(result.current.position).toEqual(mockPosition)
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('retourne error en cas de permission refusée', async () => {
    const mockError = {
      code: 1,
      message: 'Permission refusée',
      PERMISSION_DENIED: 1,
      POSITION_UNAVAILABLE: 2,
      TIMEOUT: 3,
    } as GeolocationPositionError

    Object.defineProperty(global.navigator, 'geolocation', {
      value: {
        getCurrentPosition: vi.fn((_success, error) => error(mockError)),
        watchPosition: vi.fn(() => 1),
        clearWatch: vi.fn(),
      },
      writable: true,
    })

    const { result } = renderHook(() => useGeolocation())

    await act(async () => {
      result.current.requestPosition()
    })

    expect(result.current.error).toEqual(mockError)
    expect(result.current.error?.code).toBe(1)
    expect(result.current.loading).toBe(false)
    expect(result.current.position).toBeNull()
  })
})
