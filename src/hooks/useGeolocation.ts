import { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '@/store'

interface GeolocationState {
  position: GeolocationPosition | null
  error: GeolocationPositionError | null
  loading: boolean
}

interface UseGeolocationReturn extends GeolocationState {
  requestPosition: () => void
}

export function useGeolocation(): UseGeolocationReturn {
  const setUserPosition = useAppStore((s) => s.setUserPosition)
  const setGpsMotion    = useAppStore((s) => s.setGpsMotion)
  const setGpsAccuracy  = useAppStore((s) => s.setGpsAccuracy)

  const [state, setState] = useState<GeolocationState>({
    position: null,
    error: null,
    loading: false,
  })

  const requestPosition = useCallback(() => {
    if (!navigator.geolocation) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: {
          code: 2,
          message: 'Géolocalisation non supportée par ce navigateur',
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3,
        } as GeolocationPositionError,
      }))
      return
    }

    setState((prev) => ({ ...prev, loading: true, error: null }))

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({ position, error: null, loading: false })
        setUserPosition([position.coords.longitude, position.coords.latitude])
        setGpsAccuracy(position.coords.accuracy)
      },
      (error) => {
        setState({ position: null, error, loading: false })
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      },
    )
  }, [setUserPosition])

  // Suivi continu de la position
  useEffect(() => {
    if (!navigator.geolocation) return

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setState({ position, error: null, loading: false })
        setUserPosition([position.coords.longitude, position.coords.latitude])
        setGpsMotion(position.coords.speed, position.coords.heading)
        setGpsAccuracy(position.coords.accuracy)
      },
      (error) => {
        setState((prev) => ({ ...prev, error, loading: false }))
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
      },
    )

    return () => navigator.geolocation.clearWatch(watchId)
  }, [setUserPosition, setGpsMotion, setGpsAccuracy])

  return { ...state, requestPosition }
}
