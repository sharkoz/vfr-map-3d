import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Map } from './Map'
import { DEFAULT_FILTERS } from '@/types/airspace'
import type { AirspaceCollection } from '@/types/airspace'
import type { AirportCollection } from '@/types/airport'

// --- Mocks ---

const mockAddSource = vi.fn()
const mockAddLayer = vi.fn()
const mockGetSource = vi.fn()
const mockGetLayer = vi.fn()
const mockSetFilter = vi.fn()
const mockSetLayoutProperty = vi.fn()
const mockSetPaintProperty = vi.fn()
const mockGetCanvas = vi.fn(() => ({ style: { cursor: '' } }))
const mockOnMap = vi.fn()
const mockOnce = vi.fn()

const mockFlyTo  = vi.fn()
const mockEaseTo = vi.fn()

const mockMapInstance = {
  addControl: vi.fn(),
  on: mockOnMap,
  once: mockOnce,
  remove: vi.fn(),
  addSource: mockAddSource,
  addLayer: mockAddLayer,
  getSource: mockGetSource,
  getLayer: mockGetLayer,
  setFilter: mockSetFilter,
  setLayoutProperty: mockSetLayoutProperty,
  setPaintProperty: mockSetPaintProperty,
  getCanvas: mockGetCanvas,
  loaded: vi.fn(() => true),
  flyTo: mockFlyTo,
  easeTo: mockEaseTo,
}

const mockMarkerInstance = {
  setLngLat: vi.fn().mockReturnThis(),
  addTo: vi.fn().mockReturnThis(),
  remove: vi.fn().mockReturnThis(),
}

vi.mock('maplibre-gl', () => ({
  default: {
    Map: vi.fn(function () { return mockMapInstance }),
    NavigationControl: vi.fn(function () { return {} }),
    AttributionControl: vi.fn(function () { return {} }),
    Marker: vi.fn(function () { return mockMarkerInstance }),
    addProtocol: vi.fn(),
    removeProtocol: vi.fn(),
  },
}))

vi.mock('pmtiles', () => ({
  Protocol: vi.fn(function () { return { tile: vi.fn() } }),
}))

const mockAirspaceData: AirspaceCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[[2.3, 48.8], [2.4, 48.8], [2.4, 48.9], [2.3, 48.9], [2.3, 48.8]]],
      },
      properties: {
        id: 'ctr-test',
        name: 'CTR TEST',
        type: 'CTR',
        class: 'D',
        lowerLimit: { value: 0, unit: 'FT', reference: 'AGL' },
        upperLimit: { value: 2500, unit: 'FT', reference: 'AGL' },
        country: 'FR',
      },
    },
  ],
}

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
        private: false,
        ppr: false,
        frequencies: [],
        runways: [
          { designator: '27', trueHdg: 270, length: 2680, surface: 'ASPHALT' },
          { designator: '09', trueHdg: 90,  length: 2680, surface: 'ASPHALT' },
        ],
        country: 'FR',
      },
    },
  ],
}

const mockSetSelectedZone    = vi.fn()
const mockSetSelectedAirport = vi.fn()
const mockSetZoneStack       = vi.fn()
const mockSetHighlightedZoneId = vi.fn()

vi.mock('@/store', () => {
  const makeState = () => ({
    userPosition: null,
    setSelectedZone: mockSetSelectedZone,
    setSelectedAirport: mockSetSelectedAirport,
    setZoneStack: mockSetZoneStack,
    zoneStack: null,
    filters: { ...DEFAULT_FILTERS },
    airspaceLoaded: false,
    setAirspaceLoaded: vi.fn(),
    showAirports: true,
    showPrivateAirports: false,
    userCeiling: 3500,
    highlightedZoneId: null,
    setHighlightedZoneId: mockSetHighlightedZoneId,
    darkMode: false,
  })
  const fn = vi.fn((selector: (s: ReturnType<typeof makeState>) => unknown) =>
    selector(makeState()),
  )
  // Support useAppStore.getState() utilisé dans les handlers de clic de la carte
  ;(fn as typeof fn & { getState: () => ReturnType<typeof makeState> }).getState = makeState
  return { useAppStore: fn }
})

vi.mock('@/hooks/useAirspace', () => ({
  useAirspace: vi.fn(() => ({
    data: null,
    loading: false,
    error: null,
    reload: vi.fn(),
  })),
}))

vi.mock('@/hooks/useAirports', () => ({
  useAirports: vi.fn(() => ({
    data: null,
    loading: false,
    error: null,
  })),
}))

describe('Map', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetSource.mockReturnValue(null)
    mockGetLayer.mockReturnValue(null)
    mockMapInstance.loaded.mockReturnValue(true)
    mockOnce.mockImplementation((event: string, cb: () => void) => {
      if (event === 'load') cb()
    })
  })

  it('rend le conteneur de carte', () => {
    render(<Map />)
    expect(screen.getByTestId('map-container')).toBeInTheDocument()
  })

  it('applique les classes CSS passées en prop', () => {
    render(<Map className="test-class" />)
    expect(screen.getByTestId('map-container')).toHaveClass('test-class')
  })

  it('initialise MapLibre avec les bonnes coordonnées France', async () => {
    const maplibregl = (await import('maplibre-gl')).default
    render(<Map />)
    expect(maplibregl.Map).toHaveBeenCalledWith(
      expect.objectContaining({
        center: [2.3, 46.6],
        zoom: 6,
      }),
    )
  })

  it('ajoute les couches airspace quand les données sont disponibles', async () => {
    const { useAirspace } = await import('@/hooks/useAirspace')
    vi.mocked(useAirspace).mockReturnValue({
      data: mockAirspaceData,
      loading: false,
      error: null,
      reload: vi.fn(),
    })

    render(<Map />)

    // La source reçoit les données enrichies (_floorFt, _floorM, _ceilingM)
    expect(mockAddSource).toHaveBeenCalledWith(
      'airspace',
      expect.objectContaining({
        type: 'geojson',
        data: expect.objectContaining({
          type: 'FeatureCollection',
          features: expect.arrayContaining([
            expect.objectContaining({
              properties: expect.objectContaining({
                _floorFt: 0,
                _floorM:  0,
                _ceilingM: expect.any(Number),
              }),
            }),
          ]),
        }),
      }),
    )
    // Couches visuelles + extrusion 3D + couche de détection de clic
    expect(mockAddLayer).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'airspace-fill', type: 'fill' }),
    )
    expect(mockAddLayer).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'airspace-line', type: 'line' }),
    )
    expect(mockAddLayer).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'airspace-label', type: 'symbol' }),
    )
    expect(mockAddLayer).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'airspace-extrusion', type: 'fill-extrusion' }),
    )
    // Couche fantôme pour la détection de clic sans filtre plafond
    expect(mockAddLayer).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'airspace-click-target', type: 'fill' }),
    )
    // Couches de surbrillance (depuis panneau ZoneStack)
    expect(mockAddLayer).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'airspace-highlight-fill', type: 'fill' }),
    )
    expect(mockAddLayer).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'airspace-highlight-line', type: 'line' }),
    )
  })

  it("n'ajoute pas les couches airspace si pas de données", async () => {
    const { useAirspace } = await import('@/hooks/useAirspace')
    vi.mocked(useAirspace).mockReturnValue({
      data: null,
      loading: true,
      error: null,
      reload: vi.fn(),
    })

    render(<Map />)
    expect(mockAddSource).not.toHaveBeenCalledWith('airspace', expect.anything())
  })

  it('ajoute les couches aérodromes quand les données sont disponibles', async () => {
    const { useAirports } = await import('@/hooks/useAirports')
    vi.mocked(useAirports).mockReturnValue({
      data: mockAirportData,
      loading: false,
      error: null,
    })

    render(<Map />)

    expect(mockAddSource).toHaveBeenCalledWith(
      'airports',
      expect.objectContaining({ type: 'geojson', data: mockAirportData }),
    )
    expect(mockAddLayer).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'airports-circle', type: 'circle' }),
    )
    expect(mockAddLayer).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'airports-label', type: 'symbol' }),
    )
  })

  it('ajoute la couche pistes quand les données aérodromes sont disponibles', async () => {
    const { useAirports } = await import('@/hooks/useAirports')
    vi.mocked(useAirports).mockReturnValue({
      data: mockAirportData,
      loading: false,
      error: null,
    })

    render(<Map />)

    expect(mockAddSource).toHaveBeenCalledWith(
      'runways',
      expect.objectContaining({ type: 'geojson' }),
    )
    expect(mockAddLayer).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'runways-line', type: 'line', minzoom: 11 }),
    )
  })

  it('la couche pistes est masquée quand showAirports=false', async () => {
    const { useAppStore } = await import('@/store')
    vi.mocked(useAppStore).mockImplementation((selector) => {
      const state = {
        userPosition: null,
        setSelectedZone: mockSetSelectedZone,
        setSelectedAirport: mockSetSelectedAirport,
        setZoneStack: mockSetZoneStack,
        zoneStack: null,
        filters: { ...DEFAULT_FILTERS },
        airspaceLoaded: false,
        setAirspaceLoaded: vi.fn(),
        showAirports: false,
        showPrivateAirports: false,
        userCeiling: 3500,
        highlightedZoneId: null,
        setHighlightedZoneId: mockSetHighlightedZoneId,
      }
      return selector(state)
    })

    mockGetLayer.mockReturnValue({})
    render(<Map />)

    expect(mockSetLayoutProperty).toHaveBeenCalledWith('runways-line', 'visibility', 'none')
  })

  it("masque les couches aérodromes quand showAirports=false", async () => {
    const { useAppStore } = await import('@/store')
    vi.mocked(useAppStore).mockImplementation((selector) => {
      const state = {
        userPosition: null,
        setSelectedZone: mockSetSelectedZone,
        setSelectedAirport: mockSetSelectedAirport,
        setZoneStack: mockSetZoneStack,
        zoneStack: null,
        filters: { ...DEFAULT_FILTERS },
        airspaceLoaded: false,
        setAirspaceLoaded: vi.fn(),
        showAirports: false,
        showPrivateAirports: false,
        userCeiling: 3500,
        highlightedZoneId: null,
        setHighlightedZoneId: mockSetHighlightedZoneId,
      }
      return selector(state)
    })

    const { useAirports } = await import('@/hooks/useAirports')
    vi.mocked(useAirports).mockReturnValue({
      data: mockAirportData,
      loading: false,
      error: null,
    })

    // Simuler que les couches existent
    mockGetLayer.mockReturnValue({})

    render(<Map />)

    expect(mockSetLayoutProperty).toHaveBeenCalledWith(
      expect.stringMatching(/airports/),
      'visibility',
      'none',
    )
  })

  it('applique les filtres sur les couches quand un filtre est désactivé', async () => {
    const { useAppStore } = await import('@/store')
    vi.mocked(useAppStore).mockImplementation((selector) => {
      const state = {
        userPosition: null,
        setSelectedZone: mockSetSelectedZone,
        setSelectedAirport: mockSetSelectedAirport,
        setZoneStack: mockSetZoneStack,
        zoneStack: null,
        // showClassG désactivé
        filters: { ...DEFAULT_FILTERS, showClassG: false },
        airspaceLoaded: false,
        setAirspaceLoaded: vi.fn(),
        showAirports: true,
        showPrivateAirports: false,
        userCeiling: 3500,
        highlightedZoneId: null,
        setHighlightedZoneId: mockSetHighlightedZoneId,
      }
      return selector(state)
    })

    const { useAirspace } = await import('@/hooks/useAirspace')
    vi.mocked(useAirspace).mockReturnValue({
      data: mockAirspaceData,
      loading: false,
      error: null,
      reload: vi.fn(),
    })

    // Simuler que les couches existent déjà pour le test de filtre
    mockGetLayer.mockReturnValue({})

    render(<Map />)

    // setFilter doit avoir été appelé
    expect(mockSetFilter).toHaveBeenCalled()
    // Le filtre ne doit pas inclure la classe G
    const filterCall = mockSetFilter.mock.calls[0]
    const filterExpr = JSON.stringify(filterCall[1])
    expect(filterExpr).not.toContain('"class","G"')
  })

  it('intègre le plafond utilisateur dans le filtre airspace', async () => {
    const { useAppStore } = await import('@/store')
    vi.mocked(useAppStore).mockImplementation((selector) => {
      const state = {
        userPosition: null,
        setSelectedZone: mockSetSelectedZone,
        setSelectedAirport: mockSetSelectedAirport,
        setZoneStack: mockSetZoneStack,
        zoneStack: null,
        filters: { ...DEFAULT_FILTERS },
        airspaceLoaded: false,
        setAirspaceLoaded: vi.fn(),
        showAirports: true,
        showPrivateAirports: false,
        userCeiling: 1500,
        highlightedZoneId: null,
        setHighlightedZoneId: mockSetHighlightedZoneId,
      }
      return selector(state)
    })

    const { useAirspace } = await import('@/hooks/useAirspace')
    vi.mocked(useAirspace).mockReturnValue({
      data: mockAirspaceData,
      loading: false,
      error: null,
      reload: vi.fn(),
    })

    mockGetLayer.mockReturnValue({})
    render(<Map />)

    expect(mockSetFilter).toHaveBeenCalled()
    // Le filtre airspace doit contenir la condition de plafond sur _floorFt
    // (les premières calls sont pour les couches de surbrillance → chercher dans tous)
    const airspaceFilterCall = mockSetFilter.mock.calls.find(([_id, expr]) => {
      const s = JSON.stringify(expr)
      return s.includes('_floorFt')
    })
    expect(airspaceFilterCall).toBeDefined()
    const filterExpr = JSON.stringify(airspaceFilterCall![1])
    expect(filterExpr).toContain('_floorFt')
    expect(filterExpr).toContain('1500')
  })

  it('affiche le bouton GPS', () => {
    render(<Map />)
    expect(screen.getByTestId('gps-center-btn')).toBeInTheDocument()
  })

  it('bouton GPS désactivé si pas de position', () => {
    render(<Map />)
    expect(screen.getByTestId('gps-center-btn')).toBeDisabled()
  })

  it('affiche le bouton toggle 3D/2D', () => {
    render(<Map />)
    expect(screen.getByTestId('toggle-3d-btn')).toBeInTheDocument()
    expect(screen.getByTestId('toggle-3d-btn')).toHaveTextContent('3D')
  })

  it('bascule en vue 3D au clic : pitch 60°, extrusion visible, fill masqué', () => {
    mockGetLayer.mockReturnValue({})
    render(<Map />)
    fireEvent.click(screen.getByTestId('toggle-3d-btn'))
    expect(mockEaseTo).toHaveBeenCalledWith(
      expect.objectContaining({ pitch: 60, bearing: -15 }),
    )
    expect(mockSetLayoutProperty).toHaveBeenCalledWith('airspace-extrusion', 'visibility', 'visible')
    expect(mockSetLayoutProperty).toHaveBeenCalledWith('airspace-fill', 'visibility', 'none')
    expect(mockSetLayoutProperty).toHaveBeenCalledWith('airspace-line', 'visibility', 'none')
  })

  it('revient en vue 2D au second clic : pitch 0°, fill visible, extrusion masquée', () => {
    mockGetLayer.mockReturnValue({})
    render(<Map />)
    // Premier clic → 3D
    fireEvent.click(screen.getByTestId('toggle-3d-btn'))
    // Second clic → 2D
    fireEvent.click(screen.getByTestId('toggle-3d-btn'))
    expect(mockEaseTo).toHaveBeenCalledWith(
      expect.objectContaining({ pitch: 0, bearing: 0 }),
    )
    expect(mockSetLayoutProperty).toHaveBeenCalledWith('airspace-extrusion', 'visibility', 'none')
    expect(mockSetLayoutProperty).toHaveBeenCalledWith('airspace-fill', 'visibility', 'visible')
    expect(mockSetLayoutProperty).toHaveBeenCalledWith('airspace-line', 'visibility', 'visible')
  })

  it('mode nuit : assombrit le fond OSM et adapte les labels', async () => {
    const { useAppStore } = await import('@/store')
    vi.mocked(useAppStore).mockImplementation((selector) => {
      const state = {
        userPosition: null,
        setSelectedZone: mockSetSelectedZone,
        setSelectedAirport: mockSetSelectedAirport,
        setZoneStack: mockSetZoneStack,
        zoneStack: null,
        filters: { ...DEFAULT_FILTERS },
        airspaceLoaded: false,
        setAirspaceLoaded: vi.fn(),
        showAirports: true,
        showPrivateAirports: false,
        userCeiling: 3500,
        highlightedZoneId: null,
        setHighlightedZoneId: mockSetHighlightedZoneId,
        darkMode: true,
      }
      return selector(state)
    })

    mockGetLayer.mockReturnValue({})
    render(<Map />)

    // Le fond OSM est dimmé (brightness-max < 1)
    expect(mockMapInstance.setPaintProperty).toHaveBeenCalledWith('osm-tiles', 'raster-brightness-max', 0.5)
    // Les labels passent en texte clair
    expect(mockMapInstance.setPaintProperty).toHaveBeenCalledWith('airspace-label', 'text-color', '#e2e8f0')
  })

  it('mode jour : fond OSM en pleine luminosité', async () => {
    const { useAppStore } = await import('@/store')
    vi.mocked(useAppStore).mockImplementation((selector) => {
      const state = {
        userPosition: null,
        setSelectedZone: mockSetSelectedZone,
        setSelectedAirport: mockSetSelectedAirport,
        setZoneStack: mockSetZoneStack,
        zoneStack: null,
        filters: { ...DEFAULT_FILTERS },
        airspaceLoaded: false,
        setAirspaceLoaded: vi.fn(),
        showAirports: true,
        showPrivateAirports: false,
        userCeiling: 3500,
        highlightedZoneId: null,
        setHighlightedZoneId: mockSetHighlightedZoneId,
        darkMode: false,
      }
      return selector(state)
    })

    mockGetLayer.mockReturnValue({})
    render(<Map />)
    expect(mockMapInstance.setPaintProperty).toHaveBeenCalledWith('osm-tiles', 'raster-brightness-max', 1)
  })

  it('bouton GPS actif avec une position, appelle flyTo au clic', async () => {
    const { useAppStore } = await import('@/store')
    vi.mocked(useAppStore).mockImplementation((selector) => {
      const state = {
        userPosition: [2.35, 48.86] as [number, number],
        setSelectedZone: mockSetSelectedZone,
        setSelectedAirport: mockSetSelectedAirport,
        setZoneStack: mockSetZoneStack,
        zoneStack: null,
        filters: { ...DEFAULT_FILTERS },
        airspaceLoaded: false,
        setAirspaceLoaded: vi.fn(),
        showAirports: true,
        showPrivateAirports: false,
        userCeiling: 3500,
        highlightedZoneId: null,
        setHighlightedZoneId: mockSetHighlightedZoneId,
      }
      return selector(state)
    })

    render(<Map />)
    const btn = screen.getByTestId('gps-center-btn')
    expect(btn).not.toBeDisabled()
    fireEvent.click(btn)
    expect(mockFlyTo).toHaveBeenCalledWith(
      expect.objectContaining({ center: [2.35, 48.86], zoom: 12 }),
    )
  })
})
