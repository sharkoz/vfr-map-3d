import { useEffect, useRef, useCallback, useState } from 'react'
import maplibregl from 'maplibre-gl'
import { Protocol } from 'pmtiles'
import { useAppStore } from '@/store'
import { useAirspace } from '@/hooks/useAirspace'
import { useAirports } from '@/hooks/useAirports'
import type { AirspaceFeature, AirspaceFilters, AirspaceCollection } from '@/types/airspace'
import type { AirportFeature, AirportCollection } from '@/types/airport'
import { circlePolygon } from '@/utils/geoFormat'

// France center
const FRANCE_CENTER: [number, number] = [2.3, 46.6]
const DEFAULT_ZOOM = 6
// Vue 3D ouverte par défaut au chargement
const INITIAL_3D = true

// IDs des couches MapLibre — airspace
const LAYER_FILL            = 'airspace-fill'
const LAYER_LINE            = 'airspace-line'
const LAYER_HIGHLIGHT_FILL  = 'airspace-highlight-fill'  // surbrillance depuis ZoneStack
const LAYER_HIGHLIGHT_LINE  = 'airspace-highlight-line'  // bordure de surbrillance
const LAYER_LABEL           = 'airspace-label'
const LAYER_EXTRUSION       = 'airspace-extrusion'       // vue 3D
const LAYER_CLICK_TARGET    = 'airspace-click-target'    // détection clic sans filtre plafond
const SOURCE_ID             = 'airspace'

// IDs des couches MapLibre — aérodromes
const AIRPORT_SOURCE_ID = 'airports'
const AIRPORT_LAYER_CIRCLE = 'airports-circle'
const AIRPORT_LAYER_LABEL = 'airports-label'

// IDs des couches MapLibre — pistes
const RUNWAY_SOURCE_ID = 'runways'
const RUNWAY_LAYER_LINE = 'runways-line'

// ID de la couche de fond OSM (raster) — assombrie en mode nuit
const OSM_LAYER_ID = 'osm-tiles'

// IDs des couches MapLibre — cercle de précision GPS
const GPS_ACCURACY_SOURCE_ID = 'gps-accuracy'
const GPS_ACCURACY_LAYER_FILL = 'gps-accuracy-fill'
const GPS_ACCURACY_LAYER_LINE = 'gps-accuracy-line'

// Expression MapLibre : couleur de remplissage selon le type/classe
const FILL_COLOR_EXPR: maplibregl.ExpressionSpecification = [
  'match', ['get', 'type'],
  'PROHIBITED', '#dc2626',
  'RESTRICTED', '#f87171',
  'DANGER', '#d946ef',
  'SIV', '#60a5fa',
  'PARACHUTING', '#a855f7',
  'ORNITHOLOGICAL', '#15803d',
  // Fallback : couleur par classe OACI
  [
    'match', ['coalesce', ['get', 'class'], ''],
    'A', '#ef4444',
    'B', '#ef4444',
    'C', '#f97316',
    'D', '#f97316',
    'E', '#fbbf24',
    'G', '#22c55e',
    '#f97316', // CTR/TMA sans classe → orange
  ],
]

// Expression : opacité de remplissage (zones interdites plus opaques)
const FILL_OPACITY_EXPR: maplibregl.ExpressionSpecification = [
  'match', ['get', 'type'],
  'PROHIBITED', 0.35,
  'RESTRICTED', 0.28,
  'DANGER', 0.25,
  0.15, // autres zones
]

// Expression : épaisseur de bordure
const LINE_WIDTH_EXPR: maplibregl.ExpressionSpecification = [
  'interpolate', ['linear'], ['zoom'],
  6, 0.8,
  10, 1.5,
  13, 2.0,
]

// Expression : couleur du cercle aérodrome selon le type
const AIRPORT_COLOR_EXPR: maplibregl.ExpressionSpecification = [
  'match', ['get', 'type'],
  'ULTRA_LIGHT', '#16a34a',
  'GLIDER',      '#ca8a04',
  'MILITARY',    '#dc2626',
  'HELIPORT',    '#7c3aed',
  'SEAPLANE',    '#0ea5e9',
  'PRIVATE',     '#d97706',  // ambre pour les terrains privés (Cestas, clubs…)
  '#1d4ed8', // AIRPORT, AIRFIELD, CIVIL → bleu
]

/**
 * Convertit une lowerLimit en pieds pour le filtrage MapLibre.
 * Gère les deux encodages : 'FL'/'6' (× 100) et 'FT'/'1' (brut).
 */
function altToFt(limit: { value: number; unit: unknown }): number {
  const u = String(limit.unit)
  return u === 'FL' || u === '6' ? limit.value * 100 : limit.value
}

/**
 * Enrichit chaque feature airspace avec des propriétés numériques calculées :
 * - `_floorFt`  : plancher en pieds (filtre plafond MapLibre)
 * - `_floorM`   : plancher en mètres (base d'extrusion 3D)
 * - `_ceilingM` : plafond en mètres (hauteur d'extrusion 3D)
 */
function addComputedProperties(data: AirspaceCollection): AirspaceCollection {
  return {
    ...data,
    features: data.features.map((f) => {
      const floorFt  = altToFt(f.properties.lowerLimit)
      const ceilFt   = altToFt(f.properties.upperLimit)
      return {
        ...f,
        properties: {
          ...f.properties,
          _floorFt:  floorFt,
          _floorM:   Math.max(0, floorFt * 0.3048),
          _ceilingM: Math.max(floorFt * 0.3048 + 30, ceilFt * 0.3048), // au moins 30 m de hauteur
        },
      }
    }),
  }
}

/**
 * Construit un filtre MapLibre à partir des préférences de l'utilisateur
 * et du plafond utilisateur (en pieds).
 */
function buildMapFilter(
  filters: AirspaceFilters,
  userCeiling: number,
): maplibregl.FilterSpecification | null {
  const conditions: maplibregl.ExpressionSpecification[] = []

  if (filters.showClassG) {
    conditions.push(['==', ['get', 'class'], 'G'])
  }
  if (filters.showClassE) {
    conditions.push(['==', ['get', 'class'], 'E'])
  }
  if (filters.showCTR) {
    conditions.push(['in', ['get', 'type'], ['literal', ['CTR', 'ATZ']]])
  }
  if (filters.showTMA) {
    conditions.push(['==', ['get', 'type'], 'TMA'])
  }
  if (filters.showClassAB) {
    conditions.push(['in', ['get', 'class'], ['literal', ['A', 'B']]])
  }
  if (filters.showProhibited) {
    conditions.push(['==', ['get', 'type'], 'PROHIBITED'])
  }
  if (filters.showRestricted) {
    conditions.push(['==', ['get', 'type'], 'RESTRICTED'])
  }
  if (filters.showDanger) {
    conditions.push(['==', ['get', 'type'], 'DANGER'])
  }
  if (filters.showSIV) {
    conditions.push(['==', ['get', 'type'], 'SIV'])
  }
  if (filters.showParachuting) {
    conditions.push(['==', ['get', 'type'], 'PARACHUTING'])
  }
  if (filters.showOrnithological) {
    conditions.push(['==', ['get', 'type'], 'ORNITHOLOGICAL'])
  }

  // Plafond utilisateur : masque les zones dont le plancher est ≥ au plafond
  const ceilingCond: maplibregl.ExpressionSpecification = ['<', ['get', '_floorFt'], userCeiling]

  if (conditions.length === 0) return ['boolean', false] // tout masqué
  if (conditions.length === 11) return ceilingCond       // tout visible → uniquement le plafond

  return ['all', ceilingCond, ['any', ...conditions]] as maplibregl.FilterSpecification
}

/**
 * Calcule les géométries LineString des pistes à partir des données aérodromes.
 * Utilise le cap vrai + la longueur pour dériver les deux extrémités de chaque piste.
 * Les paires opposées (ex: RWY 09 / RWY 27) sont dédupliquées : une seule ligne par piste physique.
 */
function buildRunwayFeatures(airports: AirportCollection): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = []

  for (const airport of airports.features) {
    const [lon, lat] = airport.geometry.coordinates
    const latRad = (lat * Math.PI) / 180
    const runways = Array.isArray(airport.properties.runways)
      ? airport.properties.runways
      : []

    // Dédupliquer par cap normalisé (RWY 09 = 90° et RWY 27 = 270° → même piste, hdg % 180 = 90)
    const seenHdg = new Set<number>()

    for (const rwy of runways) {
      if (!rwy.length || rwy.length === 0) continue

      const normalizedHdg = Math.round(rwy.trueHdg) % 180
      if (seenHdg.has(normalizedHdg)) continue
      seenHdg.add(normalizedHdg)

      const hdgRad = (rwy.trueHdg * Math.PI) / 180
      const halfLenM = rwy.length / 2

      // Conversion mètres → degrés en tenant compte de la latitude
      const deltaLat = (halfLenM * Math.cos(hdgRad)) / 111_000
      const deltaLon = (halfLenM * Math.sin(hdgRad)) / (111_000 * Math.cos(latRad))

      features.push({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [
            [lon - deltaLon, lat - deltaLat],
            [lon + deltaLon, lat + deltaLat],
          ],
        },
        properties: {
          surface:    rwy.surface,
          designator: rwy.designator,
          airportId:  airport.properties.id,
        },
      })
    }
  }

  return { type: 'FeatureCollection', features }
}

interface MapProps {
  className?: string
}

export function Map({ className = '' }: MapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const userMarkerRef = useRef<maplibregl.Marker | null>(null)
  const layersAddedRef = useRef(false)
  const airportLayersAddedRef = useRef(false)

  const [is3D, setIs3D] = useState(INITIAL_3D)
  const is3DRef = useRef(is3D)
  const didAutoCenterRef = useRef(false)
  // Bascule à true quand les couches sont réellement ajoutées (données chargées) :
  // déclenche l'application initiale des filtres, même si les données arrivent
  // après le montage (sinon les couches restent affichées sans filtre).
  const [layersReady, setLayersReady] = useState(false)
  const [airportLayersReady, setAirportLayersReady] = useState(false)

  const userPosition        = useAppStore((s) => s.userPosition)
  const gpsAccuracy         = useAppStore((s) => s.gpsAccuracy)
  const setSelectedAirport  = useAppStore((s) => s.setSelectedAirport)
  const setZoneStack        = useAppStore((s) => s.setZoneStack)
  const filters             = useAppStore((s) => s.filters)
  const showAirports        = useAppStore((s) => s.showAirports)
  const showPrivateAirports = useAppStore((s) => s.showPrivateAirports)
  const userCeiling         = useAppStore((s) => s.userCeiling)
  const highlightedZoneId   = useAppStore((s) => s.highlightedZoneId)
  const darkMode            = useAppStore((s) => s.darkMode)
  const zoneStackOpen       = useAppStore((s) => s.zoneStack !== null && s.zoneStack.length > 0)

  // Ref pour distinguer "clic sur aérodrome" du "clic sur fond de carte"
  const airportClickedRef = useRef(false)
  // Marqueur épingle pour le dernier clic de zone
  const clickMarkerRef = useRef<maplibregl.Marker | null>(null)

  const { data: airspaceData } = useAirspace()
  const { data: airportData } = useAirports()

  // --- Ajout des couches airspace ---
  const addAirspaceLayers = useCallback(
    (map: maplibregl.Map, data: NonNullable<typeof airspaceData>) => {
      if (layersAddedRef.current) {
        // Mettre à jour les données existantes (avec _floorFt recalculé)
        const src = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource | undefined
        src?.setData(addComputedProperties(data))
        return
      }

      // Source GeoJSON — _floorFt ajouté pour le filtre de plafond
      map.addSource(SOURCE_ID, {
        type: 'geojson',
        data: addComputedProperties(data),
        generateId: true,
      })

      // Couche de remplissage
      map.addLayer({
        id: LAYER_FILL,
        type: 'fill',
        source: SOURCE_ID,
        paint: {
          'fill-color': FILL_COLOR_EXPR,
          'fill-opacity': FILL_OPACITY_EXPR,
        },
      })

      // Couche de bordure
      map.addLayer({
        id: LAYER_LINE,
        type: 'line',
        source: SOURCE_ID,
        paint: {
          'line-color': FILL_COLOR_EXPR,
          'line-width': LINE_WIDTH_EXPR,
          'line-opacity': 0.85,
        },
      })

      // Couche de surbrillance — remplissage blanc semi-transparent (masquée par défaut)
      map.addLayer({
        id: LAYER_HIGHLIGHT_FILL,
        type: 'fill',
        source: SOURCE_ID,
        filter: ['boolean', false],
        paint: {
          'fill-color': '#ffffff',
          'fill-opacity': 0.35,
        },
      })

      // Couche de surbrillance — bordure ambrée épaisse (masquée par défaut)
      map.addLayer({
        id: LAYER_HIGHLIGHT_LINE,
        type: 'line',
        source: SOURCE_ID,
        filter: ['boolean', false],
        paint: {
          'line-color': '#f59e0b',
          'line-width': 3,
          'line-opacity': 1,
        },
      })

      // Couche de labels (visible à partir du zoom 9)
      map.addLayer({
        id: LAYER_LABEL,
        type: 'symbol',
        source: SOURCE_ID,
        minzoom: 9,
        layout: {
          'text-field': ['get', 'name'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 9, 10, 13, 13],
          'text-font': ['OpenSans'],
          'text-allow-overlap': false,
          'text-ignore-placement': false,
          'text-anchor': 'center',
          'symbol-placement': 'point',
        },
        paint: {
          'text-color': '#1e293b',
          'text-halo-color': 'rgba(255,255,255,0.85)',
          'text-halo-width': 1.5,
        },
      })

      // Couche 3D fill-extrusion (masquée par défaut, activée via toggle 3D)
      map.addLayer({
        id: LAYER_EXTRUSION,
        type: 'fill-extrusion',
        source: SOURCE_ID,
        layout: { visibility: 'none' },
        paint: {
          'fill-extrusion-color':   FILL_COLOR_EXPR,
          'fill-extrusion-base':    ['get', '_floorM'],
          'fill-extrusion-height':  ['get', '_ceilingM'],
          'fill-extrusion-opacity': 0.6,
          'fill-extrusion-vertical-gradient': true,
        } as maplibregl.FillExtrusionLayerSpecification['paint'],
      })

      // Couche fantôme pour la détection de clic :
      // - pas de filtre plafond → capture TOUTES les zones du type activé
      // - opacity 0 → invisible pour l'utilisateur
      // - queryRenderedFeatures sur cette couche retourne toutes les zones
      //   quels que soient les paramètres du plafond
      map.addLayer({
        id: LAYER_CLICK_TARGET,
        type: 'fill',
        source: SOURCE_ID,
        paint: { 'fill-opacity': 0 },
      })

      // Curseur pointer sur survol (fonctionne aussi en vue 3D où LAYER_FILL est masqué)
      map.on('mouseenter', LAYER_CLICK_TARGET, () => {
        map.getCanvas().style.cursor = 'pointer'
      })
      map.on('mouseleave', LAYER_CLICK_TARGET, () => {
        map.getCanvas().style.cursor = ''
      })

      // Curseur pour la vue 2D (couche de remplissage visible)
      map.on('mouseenter', LAYER_FILL, () => {
        map.getCanvas().style.cursor = 'pointer'
      })
      map.on('mouseleave', LAYER_FILL, () => {
        map.getCanvas().style.cursor = ''
      })

      // Vue 3D par défaut : afficher l'extrusion et masquer les couches 2D
      if (is3DRef.current) {
        map.setLayoutProperty(LAYER_EXTRUSION, 'visibility', 'visible')
        ;[LAYER_FILL, LAYER_LINE].forEach((id) =>
          map.setLayoutProperty(id, 'visibility', 'none'),
        )
      }

      layersAddedRef.current = true
      setLayersReady(true)
    },
    [],
  )

  // --- Ajout des couches aérodromes ---
  const addAirportLayers = useCallback(
    (map: maplibregl.Map, data: NonNullable<typeof airportData>) => {
      if (airportLayersAddedRef.current) {
        const src = map.getSource(AIRPORT_SOURCE_ID) as maplibregl.GeoJSONSource | undefined
        src?.setData(data)
        // Mettre à jour aussi les pistes
        const rwySrc = map.getSource(RUNWAY_SOURCE_ID) as maplibregl.GeoJSONSource | undefined
        rwySrc?.setData(buildRunwayFeatures(data))
        return
      }

      map.addSource(AIRPORT_SOURCE_ID, {
        type: 'geojson',
        data,
        generateId: true,
      })

      // Cercle coloré par type d'aérodrome
      map.addLayer({
        id: AIRPORT_LAYER_CIRCLE,
        type: 'circle',
        source: AIRPORT_SOURCE_ID,
        paint: {
          'circle-color': AIRPORT_COLOR_EXPR,
          'circle-radius': [
            'interpolate', ['linear'], ['zoom'],
            6, 3,
            10, 5,
            13, 8,
          ],
          'circle-stroke-width': [
            'interpolate', ['linear'], ['zoom'],
            6, 1,
            10, 1.5,
            13, 2,
          ],
          'circle-stroke-color': '#ffffff',
          'circle-opacity': 0.9,
        },
      })

      // Labels des aérodromes (à partir du zoom 9)
      map.addLayer({
        id: AIRPORT_LAYER_LABEL,
        type: 'symbol',
        source: AIRPORT_SOURCE_ID,
        minzoom: 9,
        layout: {
          'text-field': [
            'coalesce',
            ['get', 'icaoCode'],
            ['slice', ['get', 'name'], 0, 12],
          ],
          'text-size': ['interpolate', ['linear'], ['zoom'], 9, 9, 13, 12],
          'text-font': ['OpenSans'],
          'text-anchor': 'top',
          'text-offset': [0, 0.8],
          'text-allow-overlap': false,
        },
        paint: {
          'text-color': '#1e3a5f',
          'text-halo-color': 'rgba(255,255,255,0.9)',
          'text-halo-width': 1.5,
        },
      })

      // --- Source et couche des pistes (visibles à partir du zoom 12) ---
      map.addSource(RUNWAY_SOURCE_ID, {
        type: 'geojson',
        data: buildRunwayFeatures(data),
      })

      map.addLayer({
        id: RUNWAY_LAYER_LINE,
        type: 'line',
        source: RUNWAY_SOURCE_ID,
        minzoom: 11,
        layout: {
          'line-cap': 'butt',  // extrémités droites (réaliste pour une piste)
        },
        paint: {
          // Couleur selon la surface
          'line-color': [
            'match', ['get', 'surface'],
            'ASPHALT',  '#374151',  // gris anthracite
            'CONCRETE', '#6b7280',  // gris
            'GRASS',    '#15803d',  // vert
            'GRAVEL',   '#92400e',  // brun
            '#9ca3af',              // OTHER / inconnu → gris clair
          ] as maplibregl.ExpressionSpecification,
          'line-width': [
            'interpolate', ['linear'], ['zoom'],
            11, 1.5,
            13, 4,
            15, 9,
          ] as maplibregl.ExpressionSpecification,
          'line-opacity': 0.9,
        },
      })

      // Curseur pointer sur survol
      map.on('mouseenter', AIRPORT_LAYER_CIRCLE, () => {
        map.getCanvas().style.cursor = 'pointer'
      })
      map.on('mouseleave', AIRPORT_LAYER_CIRCLE, () => {
        map.getCanvas().style.cursor = ''
      })

      // Clic sur un aérodrome → ouvre l'AirportPanel (ferme la ZoneStack)
      // MapLibre sérialise les propriétés non-primitives en JSON strings → il faut les parser
      map.on('click', AIRPORT_LAYER_CIRCLE, (e) => {
        e.preventDefault()
        airportClickedRef.current = true  // signale au handler générique de ne pas requêter les zones
        setZoneStack(null)
        useAppStore.getState().setHighlightedZoneId(null)
        clickMarkerRef.current?.remove()
        clickMarkerRef.current = null
        if (e.features && e.features[0]) {
          const raw = e.features[0].properties as Record<string, unknown>
          const parsed: AirportFeature = {
            type: 'Feature',
            geometry: e.features[0].geometry as GeoJSON.Point,
            properties: {
              ...raw,
              frequencies: typeof raw.frequencies === 'string'
                ? JSON.parse(raw.frequencies)
                : (raw.frequencies ?? []),
              runways: typeof raw.runways === 'string'
                ? JSON.parse(raw.runways)
                : (raw.runways ?? []),
            } as AirportFeature['properties'],
          }
          setSelectedAirport(parsed)
        }
      })

      airportLayersAddedRef.current = true
      setAirportLayersReady(true)
    },
    [setSelectedAirport, setZoneStack],
  )

  // --- Initialisation de la carte ---
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return

    const protocol = new Protocol()
    maplibregl.addProtocol('pmtiles', protocol.tile)

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: {
        version: 8,
        // Glyphes auto-hébergés (offline + indépendant de demotiles). BASE_URL gère le sous-chemin Pages.
        glyphs: `${import.meta.env.BASE_URL}fonts/{fontstack}/{range}.pbf`,
        sources: {
          osm: {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution:
              '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            maxzoom: 19,
          },
        },
        layers: [{ id: 'osm-tiles', type: 'raster', source: 'osm' }],
      },
      center: FRANCE_CENTER,
      zoom: DEFAULT_ZOOM,
      pitch: INITIAL_3D ? 60 : 0,
      bearing: INITIAL_3D ? -15 : 0,
      attributionControl: false,
    })

    // Met à jour le centre dans le store (HUD coordonnées) — initial + à chaque déplacement
    const publishCenter = () => {
      const c = map.getCenter()
      useAppStore.getState().setMapCenter([c.lng, c.lat])
    }
    publishCenter()
    map.on('move', publishCenter)

    map.addControl(new maplibregl.NavigationControl(), 'bottom-left')
    map.addControl(
      new maplibregl.AttributionControl({ compact: true }),
      'bottom-right',
    )

    // Clic sur la carte → requête toutes les zones visibles à ce point
    // (les clics sur aérodromes sont interceptés avant via airportClickedRef)
    map.on('click', (e) => {
      // Un clic sur un aérodrome a déjà été traité → ignorer ici
      if (airportClickedRef.current) {
        airportClickedRef.current = false
        return
      }

      setSelectedAirport(null)

      // Requête sur la couche fantôme (pas de filtre plafond) :
      // → retourne TOUTES les zones du type activé, quelle que soit l'altitude
      // → ZoneStack gère ensuite le filtrage par plafond côté client
      // MapLibre sérialise les propriétés non-primitives → parser lowerLimit/upperLimit
      const rawFeatures = map.queryRenderedFeatures(e.point, { layers: [LAYER_CLICK_TARGET] })

      // Nouveau clic → effacer la surbrillance précédente
      useAppStore.getState().setHighlightedZoneId(null)

      if (rawFeatures.length === 0) {
        setZoneStack(null)
        // Retirer le marqueur de clic s'il existe
        clickMarkerRef.current?.remove()
        clickMarkerRef.current = null
        return
      }

      const zones: AirspaceFeature[] = rawFeatures.map((f) => {
        const raw = f.properties as Record<string, unknown>
        return {
          type: 'Feature',
          geometry: f.geometry as AirspaceFeature['geometry'],
          properties: {
            ...raw,
            lowerLimit: typeof raw.lowerLimit === 'string'
              ? JSON.parse(raw.lowerLimit)
              : raw.lowerLimit,
            upperLimit: typeof raw.upperLimit === 'string'
              ? JSON.parse(raw.upperLimit)
              : raw.upperLimit,
          } as AirspaceFeature['properties'],
        }
      })

      setZoneStack(zones)

      // Épingle indiquant le point cliqué
      if (clickMarkerRef.current) {
        clickMarkerRef.current.setLngLat(e.lngLat)
      } else {
        const el = document.createElement('div')
        el.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36" style="filter:drop-shadow(0 2px 4px rgba(0,0,0,.45))">
            <path d="M14 0C6.27 0 0 6.27 0 14c0 9.33 14 22 14 22S28 23.33 28 14C28 6.27 21.73 0 14 0z" fill="#3b82f6"/>
            <circle cx="14" cy="14" r="6" fill="white"/>
          </svg>
        `
        el.style.cursor = 'default'
        clickMarkerRef.current = new maplibregl.Marker({ element: el, anchor: 'bottom' })
          .setLngLat(e.lngLat)
          .addTo(map)
      }
    })

    mapRef.current = map

    return () => {
      layersAddedRef.current = false
      airportLayersAddedRef.current = false
      clickMarkerRef.current?.remove()
      clickMarkerRef.current = null
      maplibregl.removeProtocol('pmtiles')
      map.remove()
      mapRef.current = null
    }
  }, [setSelectedAirport, setZoneStack])

  // Garde is3DRef synchronisé pour addAirspaceLayers (callback à deps stables)
  useEffect(() => { is3DRef.current = is3D }, [is3D])

  // --- Chargement des couches airspace quand les données arrivent ---
  useEffect(() => {
    const map = mapRef.current
    if (!map || !airspaceData) return

    if (map.loaded()) {
      addAirspaceLayers(map, airspaceData)
    } else {
      map.once('load', () => addAirspaceLayers(map, airspaceData))
    }
  }, [airspaceData, addAirspaceLayers])

  // --- Chargement des couches aérodromes ---
  useEffect(() => {
    const map = mapRef.current
    if (!map || !airportData) return

    if (map.loaded()) {
      addAirportLayers(map, airportData)
    } else {
      map.once('load', () => addAirportLayers(map, airportData))
    }
  }, [airportData, addAirportLayers])

  // --- Synchronisation du filtre de surbrillance ---
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const f: maplibregl.FilterSpecification = highlightedZoneId
      ? ['==', ['get', 'id'], highlightedZoneId]
      : ['boolean', false]

    ;[LAYER_HIGHLIGHT_FILL, LAYER_HIGHLIGHT_LINE].forEach((id) => {
      if (map.getLayer(id)) map.setFilter(id, f)
    })
  }, [highlightedZoneId])

  // --- Application des filtres airspace (types de zone + plafond utilisateur) ---
  useEffect(() => {
    const map = mapRef.current
    if (!map || !layersAddedRef.current) return

    // On masque la SIV si la couche est décochée OU en vue 3D (encombre la scène
    // extrudée). Exclusion « dure » par type, appliquée à TOUTES les couches
    // (remplissage, bordure, label, extrusion, détection de clic) : garantit le
    // masquage même si une zone SIV recoupait une autre catégorie cochée.
    const hideSiv = is3D || !filters.showSIV
    const applySiv = (
      f: maplibregl.FilterSpecification | null,
    ): maplibregl.FilterSpecification | undefined =>
      hideSiv && f
        ? (['all', f, ['!=', ['get', 'type'], 'SIV']] as maplibregl.FilterSpecification)
        : (f ?? undefined)

    // Couches type + plafond (fill / line / label / extrusion 3D)
    const visualFilter = buildMapFilter(filters, userCeiling)
    ;[LAYER_FILL, LAYER_LINE, LAYER_LABEL, LAYER_EXTRUSION].forEach((id) => {
      if (map.getLayer(id)) map.setFilter(id, applySiv(visualFilter))
    })

    // Couche de détection de clic : filtre type uniquement (pas de plafond)
    // → 999_999 ft = aucune zone réelle ne dépasse cette altitude
    const typeFilter = buildMapFilter(filters, 999_999)
    if (map.getLayer(LAYER_CLICK_TARGET)) {
      map.setFilter(LAYER_CLICK_TARGET, applySiv(typeFilter))
    }
  }, [filters, userCeiling, is3D, layersReady])

  // --- Affichage/masquage et filtre des aérodromes ---
  useEffect(() => {
    const map = mapRef.current
    if (!map || !airportLayersAddedRef.current) return

    const visibility = showAirports ? 'visible' : 'none'
    ;[AIRPORT_LAYER_CIRCLE, AIRPORT_LAYER_LABEL, RUNWAY_LAYER_LINE].forEach((id) => {
      if (map.getLayer(id)) {
        map.setLayoutProperty(id, 'visibility', visibility)
      }
    })

    // Filtre: masquer les terrains fermés si non demandés
    if (showAirports) {
      const airportFilter: maplibregl.FilterSpecification | undefined = showPrivateAirports
        ? undefined  // tout afficher
        : ['!=', ['get', 'type'], 'PRIVATE']
      ;[AIRPORT_LAYER_CIRCLE, AIRPORT_LAYER_LABEL].forEach((id) => {
        if (map.getLayer(id)) {
          map.setFilter(id, airportFilter)
        }
      })
    }
  }, [showAirports, showPrivateAirports, airportLayersReady])

  // --- Mode nuit : assombrit le fond OSM et renforce le contraste des zones ---
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const apply = () => {
      // Fond de carte raster : dimmé + désaturé + teinté bleu nuit pour réduire l'éblouissement cockpit
      if (map.getLayer(OSM_LAYER_ID)) {
        map.setPaintProperty(OSM_LAYER_ID, 'raster-brightness-max', darkMode ? 0.5 : 1)
        map.setPaintProperty(OSM_LAYER_ID, 'raster-saturation',     darkMode ? -0.55 : 0)
        map.setPaintProperty(OSM_LAYER_ID, 'raster-contrast',       darkMode ? 0.12 : 0)
        map.setPaintProperty(OSM_LAYER_ID, 'raster-hue-rotate',     darkMode ? 200 : 0)
      }

      // Zones : bordures plus marquées sur fond sombre
      if (map.getLayer(LAYER_LINE)) {
        map.setPaintProperty(LAYER_LINE, 'line-opacity', darkMode ? 1 : 0.85)
      }
      if (map.getLayer(LAYER_FILL)) {
        map.setPaintProperty(
          LAYER_FILL,
          'fill-opacity',
          darkMode
            ? (['match', ['get', 'type'],
                'PROHIBITED', 0.45, 'RESTRICTED', 0.38, 'DANGER', 0.35, 0.22,
              ] as maplibregl.ExpressionSpecification)
            : FILL_OPACITY_EXPR,
        )
      }

      // Labels : texte clair + halo sombre la nuit (inverse du mode jour)
      if (map.getLayer(LAYER_LABEL)) {
        map.setPaintProperty(LAYER_LABEL, 'text-color',      darkMode ? '#e2e8f0' : '#1e293b')
        map.setPaintProperty(LAYER_LABEL, 'text-halo-color', darkMode ? 'rgba(7,12,20,0.9)' : 'rgba(255,255,255,0.85)')
      }
      if (map.getLayer(AIRPORT_LAYER_LABEL)) {
        map.setPaintProperty(AIRPORT_LAYER_LABEL, 'text-color',      darkMode ? '#cfe3f5' : '#1e3a5f')
        map.setPaintProperty(AIRPORT_LAYER_LABEL, 'text-halo-color', darkMode ? 'rgba(7,12,20,0.9)' : 'rgba(255,255,255,0.9)')
      }
    }

    if (map.loaded()) apply()
    else map.once('load', apply)
  }, [darkMode])

  // --- Cercle de précision GPS ---
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const render = () => {
      // Pas de position ou précision inconnue → vider la source si présente
      const data: GeoJSON.FeatureCollection =
        userPosition && gpsAccuracy != null && gpsAccuracy > 0
          ? { type: 'FeatureCollection', features: [circlePolygon(userPosition[0], userPosition[1], gpsAccuracy)] }
          : { type: 'FeatureCollection', features: [] }

      const existing = map.getSource(GPS_ACCURACY_SOURCE_ID) as maplibregl.GeoJSONSource | undefined
      if (existing) {
        existing.setData(data)
        return
      }

      map.addSource(GPS_ACCURACY_SOURCE_ID, { type: 'geojson', data })
      map.addLayer({
        id: GPS_ACCURACY_LAYER_FILL,
        type: 'fill',
        source: GPS_ACCURACY_SOURCE_ID,
        paint: { 'fill-color': '#20d880', 'fill-opacity': 0.1 },
      })
      map.addLayer({
        id: GPS_ACCURACY_LAYER_LINE,
        type: 'line',
        source: GPS_ACCURACY_SOURCE_ID,
        paint: { 'line-color': '#20d880', 'line-width': 1, 'line-opacity': 0.4 },
      })
    }

    if (map.loaded()) render()
    else map.once('load', render)
  }, [userPosition, gpsAccuracy])

  // --- Recentrage automatique sur la première position GPS reçue ---
  // (ouverture centrée sur la géoloc au chargement, en complément de la vue 3D)
  useEffect(() => {
    const map = mapRef.current
    if (!map || !userPosition || didAutoCenterRef.current) return
    didAutoCenterRef.current = true
    map.flyTo({ center: userPosition, zoom: 12, duration: 1200 })
  }, [userPosition])

  // --- Marqueur GPS ---
  useEffect(() => {
    if (!mapRef.current || !userPosition) return

    if (userMarkerRef.current) {
      userMarkerRef.current.setLngLat(userPosition)
    } else {
      const el = document.createElement('div')
      el.innerHTML = `
        <div style="position:relative;width:18px;height:18px">
          <div style="position:absolute;inset:-5px;border-radius:50%;border:1.5px solid rgba(32,216,128,0.35);animation:gps-ping 2s cubic-bezier(0,0,.2,1) infinite"></div>
          <div style="width:18px;height:18px;background:#20d880;border-radius:50%;border:2.5px solid #070c14;box-shadow:0 0 10px rgba(32,216,128,0.55)"></div>
        </div>
      `

      userMarkerRef.current = new maplibregl.Marker({ element: el })
        .setLngLat(userPosition)
        .addTo(mapRef.current)
    }
  }, [userPosition])

  const toggle3D = useCallback(() => {
    const map = mapRef.current
    if (!map) return

    const next = !is3D
    setIs3D(next)

    if (next) {
      // Basculer en vue 3D : incliner la caméra, afficher l'extrusion
      map.easeTo({ pitch: 60, bearing: -15, duration: 900 })
      if (map.getLayer(LAYER_EXTRUSION))
        map.setLayoutProperty(LAYER_EXTRUSION, 'visibility', 'visible')
      ;[LAYER_FILL, LAYER_LINE].forEach((id) => {
        if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', 'none')
      })
    } else {
      // Revenir en 2D : redresser la caméra, masquer l'extrusion
      map.easeTo({ pitch: 0, bearing: 0, duration: 700 })
      if (map.getLayer(LAYER_EXTRUSION))
        map.setLayoutProperty(LAYER_EXTRUSION, 'visibility', 'none')
      ;[LAYER_FILL, LAYER_LINE].forEach((id) => {
        if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', 'visible')
      })
    }
  }, [is3D])

  const handleCenterOnGPS = () => {
    if (!mapRef.current || !userPosition) return
    mapRef.current.flyTo({ center: userPosition, zoom: 12, duration: 1000 })
  }

  return (
    <div className={`relative w-full h-full ${className}`} data-testid="map-container">
      <div
        ref={mapContainerRef}
        className="w-full h-full"
      />
      {/* Bouton vue 3D / 2D */}
      <button
        onClick={toggle3D}
        data-testid="toggle-3d-btn"
        aria-label={is3D ? 'Passer en vue 2D' : 'Passer en vue 3D'}
        title={is3D ? 'Vue 2D' : 'Vue 3D'}
        className={`absolute bottom-40 z-10 backdrop-blur-sm rounded-xl shadow-lg px-3 py-2 font-display font-bold text-xs tracking-widest transition-all duration-200 ${
          zoneStackOpen ? 'right-[336px]' : 'right-3'
        }`}
        style={is3D ? {
          background: 'rgba(240,160,32,0.15)',
          border: '1px solid rgba(240,160,32,0.4)',
          color: '#f0a020',
          boxShadow: '0 0 12px rgba(240,160,32,0.2)',
        } : {
          background: 'rgba(10,16,28,0.92)',
          border: '1px solid rgba(42,68,100,0.6)',
          color: '#5a7a9a',
        }}
      >
        {is3D ? '2D' : '3D'}
      </button>

      {/* Bouton centrer sur position GPS */}
      <button
        onClick={handleCenterOnGPS}
        disabled={!userPosition}
        data-testid="gps-center-btn"
        aria-label="Centrer sur ma position"
        title="Centrer sur ma position"
        className={`absolute bottom-28 z-10 backdrop-blur-sm rounded-xl shadow-lg p-2.5 transition-all duration-200 disabled:opacity-30 ${
          zoneStackOpen ? 'right-[336px]' : 'right-3'
        }`}
        style={{
          background: 'rgba(10,16,28,0.92)',
          border: userPosition ? '1px solid rgba(32,216,128,0.35)' : '1px solid rgba(42,68,100,0.5)',
          color: userPosition ? '#20d880' : '#3a5070',
          fontSize: '18px',
        }}
      >
        🎯
      </button>
    </div>
  )
}
