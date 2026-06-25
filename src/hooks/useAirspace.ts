import { useState, useEffect } from 'react'
import { loadAirspace, saveAirspace, isAirspaceFresh } from '@/db'
import { useAppStore } from '@/store'
import type { AirspaceCollection } from '@/types/airspace'

interface UseAirspaceReturn {
  data: AirspaceCollection | null
  loading: boolean
  error: string | null
  reload: () => void
}

export function useAirspace(): UseAirspaceReturn {
  const setAirspaceLoaded = useAppStore((s) => s.setAirspaceLoaded)

  const [data, setData] = useState<AirspaceCollection | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const reload = () => setReloadKey((k) => k + 1)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)

      try {
        // 1. Essayer IndexedDB d'abord
        const cached = await loadAirspace()
        if (cached && !cancelled) {
          setData(cached)
          setAirspaceLoaded(true)
          setLoading(false)

          // Si les données sont fraîches, on s'arrête
          const fresh = await isAirspaceFresh()
          if (fresh) return
        }

        // 2. Charger le fichier bundlé (BASE_URL gère le sous-chemin GitHub Pages)
        const response = await fetch(`${import.meta.env.BASE_URL}data/airspace-france.geojson`)
        if (!response.ok) {
          throw new Error(`Erreur chargement airspace: ${response.status}`)
        }

        const geojson: AirspaceCollection = await response.json()

        if (!cancelled) {
          // Sauvegarder en IndexedDB pour usage offline
          await saveAirspace(geojson)
          setData(geojson)
          setAirspaceLoaded(true)
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Erreur inconnue'
          setError(message)
          console.warn('[useAirspace] Échec du chargement:', message)

          // Tenter de charger depuis IndexedDB même si pas frais
          const cached = await loadAirspace()
          if (cached && !cancelled) {
            setData(cached)
            setAirspaceLoaded(true)
          }
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [reloadKey, setAirspaceLoaded])

  return { data, loading, error, reload }
}
