import { useState, useEffect } from 'react'
import { loadNotam, saveNotam, isNotamFresh } from '@/db'

interface NotamData {
  items: NotamItem[]
  fetchedAt: number | null
  isFromCache: boolean
  cacheExpired: boolean
}

export interface NotamItem {
  id: string
  text: string
  location: string
  startTime: string
  endTime: string
  coordinates?: [number, number]
  radius?: number
}

interface UseNotamReturn {
  data: NotamData | null
  loading: boolean
  error: string | null
  refresh: () => void
}

const CACHE_WARN_THRESHOLD = 24 * 60 * 60 * 1000 // 24h

export function useNotam(icao: string = 'LFFF'): UseNotamReturn {
  const [data, setData] = useState<NotamData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const refresh = () => setRefreshKey((k) => k + 1)

  useEffect(() => {
    let cancelled = false

    async function fetchNotam() {
      setLoading(true)
      setError(null)

      // 1. Essayer le cache IndexedDB
      const cached = await loadNotam(icao)
      const fresh = await isNotamFresh(icao)

      if (cached && fresh && !cancelled) {
        setData({
          items: cached.data as NotamItem[],
          fetchedAt: cached.fetchedAt,
          isFromCache: false,
          cacheExpired: false,
        })
        setLoading(false)
        return
      }

      // 2. Fetch réseau
      try {
        // TODO: remplacer par l'URL API NOTAM réelle
        // Pour l'instant on utilise un endpoint de test
        const apiKey = import.meta.env.VITE_OPENAIP_API_KEY
        if (!apiKey) throw new Error('Clé API OpenAIP manquante')

        const response = await fetch(
          `https://api.openaip.net/api/notam?icao=${icao}&limit=50`,
          { headers: { 'x-openaip-api-key': apiKey } },
        )

        if (!response.ok) {
          throw new Error(`Erreur API NOTAM: ${response.status}`)
        }

        const json = await response.json()
        const items: NotamItem[] = (json.items || []).map((item: Record<string, unknown>) => ({
          id: item.id ?? '',
          text: item.notamText ?? '',
          location: item.location ?? icao,
          startTime: item.startDate ?? '',
          endTime: item.endDate ?? '',
        }))

        await saveNotam(icao, items)

        if (!cancelled) {
          setData({
            items,
            fetchedAt: Date.now(),
            isFromCache: false,
            cacheExpired: false,
          })
        }
      } catch (err) {
        // Fallback sur cache IndexedDB même si expiré
        if (cached && !cancelled) {
          const age = Date.now() - cached.fetchedAt
          setData({
            items: cached.data as NotamItem[],
            fetchedAt: cached.fetchedAt,
            isFromCache: true,
            cacheExpired: age > CACHE_WARN_THRESHOLD,
          })
        } else if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Erreur inconnue')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchNotam()
    return () => { cancelled = true }
  }, [icao, refreshKey])

  return { data, loading, error, refresh }
}
