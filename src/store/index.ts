import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AirspaceFeature, AirspaceFilters } from '@/types/airspace'
import { DEFAULT_FILTERS } from '@/types/airspace'
import type { AirportFeature } from '@/types/airport'

interface AppState {
  // Position GPS
  userPosition: [number, number] | null
  setUserPosition: (pos: [number, number] | null) => void

  // Précision GPS en mètres (cercle de précision sur la carte)
  gpsAccuracy: number | null
  setGpsAccuracy: (accuracy: number | null) => void

  // Zone aérienne sélectionnée (pour le panel)
  selectedZone: AirspaceFeature | null
  setSelectedZone: (zone: AirspaceFeature | null) => void

  // Aérodrome sélectionné (pour le panel)
  selectedAirport: AirportFeature | null
  setSelectedAirport: (airport: AirportFeature | null) => void

  // Filtres des couches
  filters: AirspaceFilters
  setFilter: <K extends keyof AirspaceFilters>(key: K, value: AirspaceFilters[K]) => void
  resetFilters: () => void

  // Affichage des aérodromes
  showAirports: boolean
  toggleAirports: () => void

  // Affichage des terrains privés (type=6 OpenAIP — clubs, fermes, PPR)
  showPrivateAirports: boolean
  togglePrivateAirports: () => void

  // Stack de zones aériennes à une coordonnée cliquée (panneau droit)
  zoneStack: AirspaceFeature[] | null
  setZoneStack: (zones: AirspaceFeature[] | null) => void

  // Zone mise en surbrillance depuis le panneau ZoneStack (par identifiant)
  highlightedZoneId: string | null
  setHighlightedZoneId: (id: string | null) => void

  // Plafond utilisateur en pieds (masque les zones au-dessus, affecte la ZoneStack)
  userCeiling: number
  setUserCeiling: (ceiling: number) => void

  // Statut offline
  isOnline: boolean
  setIsOnline: (online: boolean) => void

  // Données airspace chargées
  airspaceLoaded: boolean
  setAirspaceLoaded: (loaded: boolean) => void

  // Mode nuit
  darkMode: boolean
  toggleDarkMode: () => void

  // Centre courant de la carte (HUD coordonnées) — [lon, lat]
  mapCenter: [number, number] | null
  setMapCenter: (center: [number, number] | null) => void

  // Mouvement GPS (HUD cap + vitesse sol)
  gpsSpeed: number | null   // m/s
  gpsHeading: number | null // degrés vrais
  setGpsMotion: (speed: number | null, heading: number | null) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      userPosition: null,
      setUserPosition: (pos) => set({ userPosition: pos }),

      gpsAccuracy: null,
      setGpsAccuracy: (accuracy) => set({ gpsAccuracy: accuracy }),

      selectedZone: null,
      setSelectedZone: (zone) => set({ selectedZone: zone }),

      selectedAirport: null,
      setSelectedAirport: (airport) => set({ selectedAirport: airport }),

      filters: DEFAULT_FILTERS,
      setFilter: (key, value) =>
        set((state) => ({ filters: { ...state.filters, [key]: value } })),
      resetFilters: () => set({ filters: DEFAULT_FILTERS }),

      showAirports: true,
      toggleAirports: () => set((state) => ({ showAirports: !state.showAirports })),

      showPrivateAirports: false,
      togglePrivateAirports: () => set((state) => ({ showPrivateAirports: !state.showPrivateAirports })),

      zoneStack: null,
      setZoneStack: (zones) => set({ zoneStack: zones }),

      highlightedZoneId: null,
      setHighlightedZoneId: (id) => set({ highlightedZoneId: id }),

      userCeiling: 900,
      setUserCeiling: (ceiling) => set({ userCeiling: ceiling }),

      isOnline: true,
      setIsOnline: (online) => set({ isOnline: online }),

      airspaceLoaded: false,
      setAirspaceLoaded: (loaded) => set({ airspaceLoaded: loaded }),

      darkMode: false,
      toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),

      mapCenter: null,
      setMapCenter: (center) => set({ mapCenter: center }),

      gpsSpeed: null,
      gpsHeading: null,
      setGpsMotion: (speed, heading) => set({ gpsSpeed: speed, gpsHeading: heading }),
    }),
    {
      name: 'vfr-ulm-settings',
      version: 1,
      // Ne persister que les préférences utilisateur, pas l'état de session.
      // userCeiling n'est PAS persisté : au chargement on repart toujours à 900 ft
      // (vue « décollage », cf. ouverture 3D centrée sur la position).
      partialize: (state) => ({
        filters: state.filters,
        showAirports: state.showAirports,
        showPrivateAirports: state.showPrivateAirports,
        darkMode: state.darkMode,
      }),
      // v1 : purge un éventuel userCeiling persisté par une version antérieure
      migrate: (persisted) => {
        if (persisted && typeof persisted === 'object') {
          const rest = { ...(persisted as Record<string, unknown>) }
          delete rest.userCeiling
          return rest as unknown as AppState
        }
        return persisted as AppState
      },
    },
  ),
)
