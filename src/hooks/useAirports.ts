import { useState, useEffect } from 'react'
import type { AirportCollection } from '@/types/airport'

interface UseAirportsReturn {
  data: AirportCollection | null
  loading: boolean
  error: string | null
}

export function useAirports(): UseAirportsReturn {
  const [data, setData] = useState<AirportCollection | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch('/data/airports-france.geojson')
        if (!response.ok) {
          throw new Error(`Erreur chargement aérodromes: ${response.status}`)
        }

        const geojson: AirportCollection = await response.json()

        if (!cancelled) {
          setData(geojson)
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Erreur inconnue'
          setError(message)
          console.warn('[useAirports] Échec du chargement:', message)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [])

  return { data, loading, error }
}
