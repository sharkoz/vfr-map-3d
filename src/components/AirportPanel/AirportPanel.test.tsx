import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AirportPanel } from './AirportPanel'
import type { AirportFeature } from '@/types/airport'

const mockSetSelectedAirport = vi.fn()

vi.mock('@/store', () => ({
  useAppStore: vi.fn((selector) => {
    const state = { setSelectedAirport: mockSetSelectedAirport }
    return selector(state)
  }),
}))

// --- Fixtures ---

const mockAirport: AirportFeature = {
  type: 'Feature',
  geometry: { type: 'Point', coordinates: [2.441, 48.969] },
  properties: {
    id: 'lfpb', name: 'PARIS LE BOURGET',
    icaoCode: 'LFPB', iataCode: 'LBG',
    type: 'AIRPORT', elevation: 218,
    private: false, ppr: false,
    frequencies: [
      { value: '119.350', type: 14, name: 'Tower' },
      { value: '121.700', type: 9,  name: 'Ground' },
    ],
    runways: [
      { designator: '27', trueHdg: 270, length: 2680, surface: 'ASPHALT' },
      { designator: '09', trueHdg: 90,  length: 2680, surface: 'ASPHALT' },
    ],
    country: 'FR',
  },
}

const mockULMAirport: AirportFeature = {
  type: 'Feature',
  geometry: { type: 'Point', coordinates: [1.5, 47.0] },
  properties: {
    id: 'ulm-test', name: 'TERRAIN ULM TEST',
    icaoCode: null, iataCode: null,
    type: 'ULTRA_LIGHT', elevation: 250,
    private: false, ppr: false,
    frequencies: [],
    runways: [{ designator: '09', trueHdg: 90, length: 400, surface: 'GRASS' }],
    country: 'FR',
  },
}

// Terrain privé — type=6 OpenAIP (ex: CESTAS)
const mockPrivateAirport: AirportFeature = {
  type: 'Feature',
  geometry: { type: 'Point', coordinates: [-0.784, 44.702] },
  properties: {
    id: 'cestas', name: 'CESTAS',
    icaoCode: 'LF3354', iataCode: null,
    type: 'PRIVATE', elevation: 76,
    private: true, ppr: false,
    frequencies: [{ value: '125.335', type: 12, name: 'A/A' }],
    runways: [
      { designator: '07', trueHdg: 70,  length: 470, surface: 'GRASS' },
      { designator: '25', trueHdg: 250, length: 470, surface: 'GRASS' },
    ],
    country: 'FR',
  },
}

const mockPPRAirport: AirportFeature = {
  ...mockPrivateAirport,
  properties: { ...mockPrivateAirport.properties, ppr: true },
}

// Simule ce que MapLibre renvoie : propriétés non-primitives sérialisées en JSON strings
const mockAirportFromMaplibre: AirportFeature = {
  type: 'Feature',
  geometry: { type: 'Point', coordinates: [2.441, 48.969] },
  properties: {
    id: 'lfpb', name: 'PARIS LE BOURGET',
    icaoCode: 'LFPB', iataCode: null,
    type: 'AIRPORT', elevation: 218,
    private: false, ppr: false,
    // MapLibre sérialise les tableaux en JSON strings
    frequencies: '[{"value":"119.350","type":14,"name":"Tower"}]' as unknown as [],
    runways: '[{"designator":"27","trueHdg":270,"length":2680,"surface":"ASPHALT"}]' as unknown as [],
    country: 'FR',
  },
}

const mockAirportWithZeroRunways: AirportFeature = {
  type: 'Feature',
  geometry: { type: 'Point', coordinates: [0, 45] },
  properties: {
    id: 'abbeville', name: 'ABBEVILLE',
    icaoCode: 'LFOI', iataCode: null,
    type: 'AIRFIELD', elevation: 67,
    private: false, ppr: false,
    frequencies: [],
    // Pistes avec cap 0 et longueur 0 (données OpenAIP manquantes avant le fix)
    runways: [
      { designator: '13', trueHdg: 0, length: 0, surface: 'GRASS' },
      { designator: '31', trueHdg: 0, length: 0, surface: 'GRASS' },
    ],
    country: 'FR',
  },
}

describe('AirportPanel', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it("n'affiche rien quand airport est null", () => {
    const { container } = render(<AirportPanel airport={null} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('affiche le nom et le code ICAO', () => {
    render(<AirportPanel airport={mockAirport} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('PARIS LE BOURGET')).toBeInTheDocument()
    expect(screen.getByText('LFPB')).toBeInTheDocument()
  })

  it("affiche le code IATA s'il est présent", () => {
    render(<AirportPanel airport={mockAirport} />)
    expect(screen.getByText('LBG')).toBeInTheDocument()
  })

  it("n'affiche pas le code IATA s'il est null", () => {
    render(<AirportPanel airport={mockULMAirport} />)
    expect(screen.queryByText('LBG')).not.toBeInTheDocument()
  })

  it("affiche l'élévation", () => {
    render(<AirportPanel airport={mockAirport} />)
    // "218" and "ft AMSL" are in separate elements — check textContent of container
    expect(screen.getByText((_, el) =>
      (el?.textContent?.replace(/\s+/g, ' ').trim() === '218 ft AMSL') ?? false
    )).toBeInTheDocument()
  })

  it('affiche les fréquences', () => {
    render(<AirportPanel airport={mockAirport} />)
    expect(screen.getByText(/119.350/)).toBeInTheDocument()
    expect(screen.getByText(/121.700/)).toBeInTheDocument()
  })

  it('affiche "Tour" pour le type de fréquence 14', () => {
    render(<AirportPanel airport={mockAirport} />)
    expect(screen.getByText('Tour')).toBeInTheDocument()
  })

  it('affiche "Sol" pour le type de fréquence 9', () => {
    render(<AirportPanel airport={mockAirport} />)
    expect(screen.getByText('Sol')).toBeInTheDocument()
  })

  it('affiche "A/A" pour le type de fréquence 12 (terrain privé)', () => {
    render(<AirportPanel airport={mockPrivateAirport} />)
    expect(screen.getByText('A/A')).toBeInTheDocument()
  })

  // --- Tests pistes ---

  it('affiche le designateur de piste (RWY XX)', () => {
    render(<AirportPanel airport={mockAirport} />)
    expect(screen.getByText('RWY 27')).toBeInTheDocument()
    expect(screen.getByText('RWY 09')).toBeInTheDocument()
  })

  it('affiche la longueur de piste en mètres', () => {
    render(<AirportPanel airport={mockAirport} />)
    expect(screen.getAllByText('2680 m')).toHaveLength(2)
  })

  it('affiche la surface ASPHALT comme "Asphalte"', () => {
    render(<AirportPanel airport={mockAirport} />)
    expect(screen.getAllByText('Asphalte').length).toBeGreaterThan(0)
  })

  it('affiche la surface GRASS comme "Herbe"', () => {
    render(<AirportPanel airport={mockULMAirport} />)
    expect(screen.getByText('Herbe')).toBeInTheDocument()
  })

  it("n'affiche pas la longueur quand elle est 0", () => {
    render(<AirportPanel airport={mockAirportWithZeroRunways} />)
    expect(screen.queryByText(/0 m/)).not.toBeInTheDocument()
  })

  it('affiche les designateurs même quand cap et longueur sont 0', () => {
    render(<AirportPanel airport={mockAirportWithZeroRunways} />)
    expect(screen.getByText('RWY 13')).toBeInTheDocument()
    expect(screen.getByText('RWY 31')).toBeInTheDocument()
  })

  // --- Test parsing MapLibre (JSON strings → objets) ---

  it('affiche correctement les données quand MapLibre a sérialisé les tableaux en JSON strings', () => {
    render(<AirportPanel airport={mockAirportFromMaplibre} />)
    expect(screen.getByText('PARIS LE BOURGET')).toBeInTheDocument()
    expect(screen.getByText(/119.350/)).toBeInTheDocument()
    expect(screen.getByText('RWY 27')).toBeInTheDocument()
    expect(screen.getByText('2680 m')).toBeInTheDocument()
  })

  it('affiche le type correct pour un terrain ULM', () => {
    render(<AirportPanel airport={mockULMAirport} />)
    expect(screen.getByText('Terrain ULM')).toBeInTheDocument()
  })

  // --- Tests terrain privé (CESTAS et similaires) ---

  it('affiche le badge privé pour un terrain type PRIVATE', () => {
    render(<AirportPanel airport={mockPrivateAirport} />)
    expect(screen.getByTestId('airport-private-badge')).toBeInTheDocument()
  })

  it('affiche "accord préalable recommandé" quand PPR=false', () => {
    render(<AirportPanel airport={mockPrivateAirport} />)
    expect(screen.getByText(/accord préalable recommandé/i)).toBeInTheDocument()
  })

  it('affiche "PPR obligatoire" quand PPR=true', () => {
    render(<AirportPanel airport={mockPPRAirport} />)
    expect(screen.getByText(/PPR obligatoire/i)).toBeInTheDocument()
  })

  it("n'affiche pas le badge privé pour un aérodrome public", () => {
    render(<AirportPanel airport={mockAirport} />)
    expect(screen.queryByTestId('airport-private-badge')).not.toBeInTheDocument()
  })

  it("ferme au clic sur l'overlay", () => {
    render(<AirportPanel airport={mockAirport} />)
    fireEvent.click(screen.getByTestId('airport-panel-overlay'))
    expect(mockSetSelectedAirport).toHaveBeenCalledWith(null)
  })

  it('ferme au clic sur le bouton fermer', () => {
    render(<AirportPanel airport={mockAirport} />)
    fireEvent.click(screen.getByLabelText('Fermer'))
    expect(mockSetSelectedAirport).toHaveBeenCalledWith(null)
  })

  it('affiche un message si aucune info disponible', () => {
    const emptyAirport: AirportFeature = {
      ...mockAirport,
      properties: { ...mockAirport.properties, frequencies: [], runways: [] },
    }
    render(<AirportPanel airport={emptyAirport} />)
    expect(screen.getByText(/Aucune information disponible/)).toBeInTheDocument()
  })
})
