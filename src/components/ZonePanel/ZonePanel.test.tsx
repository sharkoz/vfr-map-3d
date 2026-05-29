import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ZonePanel } from './ZonePanel'
import type { AirspaceFeature } from '@/types/airspace'

const mockSetSelectedZone = vi.fn()

vi.mock('@/store', () => ({
  useAppStore: vi.fn((selector) => {
    const state = { setSelectedZone: mockSetSelectedZone }
    return selector(state)
  }),
}))

const mockZone: AirspaceFeature = {
  type: 'Feature',
  geometry: {
    type: 'Polygon',
    coordinates: [[[2.3, 48.8], [2.4, 48.8], [2.4, 48.9], [2.3, 48.9], [2.3, 48.8]]],
  },
  properties: {
    id: 'ctr-orly',
    name: 'CTR PARIS-ORLY',
    type: 'CTR',
    class: 'D',
    lowerLimit: { value: 0, unit: 'FT', reference: 'AGL' },
    upperLimit: { value: 2500, unit: 'FT', reference: 'AGL' },
    frequency: '118.7',
    callsign: 'ORLY APP',
    country: 'FR',
  },
}

describe('ZonePanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('n\'affiche rien si zone=null', () => {
    const { container } = render(<ZonePanel zone={null} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('affiche le nom de la zone', () => {
    render(<ZonePanel zone={mockZone} />)
    expect(screen.getByText('CTR PARIS-ORLY')).toBeInTheDocument()
  })

  it('affiche le plancher et le plafond', () => {
    render(<ZonePanel zone={mockZone} />)
    expect(screen.getByText('Sol')).toBeInTheDocument()
    expect(screen.getByText('2500 ft AGL')).toBeInTheDocument()
  })

  it('affiche la fréquence radio', () => {
    render(<ZonePanel zone={mockZone} />)
    expect(screen.getByText('118.7 MHz')).toBeInTheDocument()
  })

  it('affiche l\'indicatif', () => {
    render(<ZonePanel zone={mockZone} />)
    expect(screen.getByText('ORLY APP')).toBeInTheDocument()
  })

  it('ferme le panel au clic sur le bouton fermer', () => {
    render(<ZonePanel zone={mockZone} />)
    fireEvent.click(screen.getByLabelText('Fermer'))
    expect(mockSetSelectedZone).toHaveBeenCalledWith(null)
  })

  it('ferme le panel au clic sur l\'overlay', () => {
    render(<ZonePanel zone={mockZone} />)
    fireEvent.click(screen.getByTestId('zone-panel-overlay'))
    expect(mockSetSelectedZone).toHaveBeenCalledWith(null)
  })

  it('affiche la règle ULM pour une CTR', () => {
    render(<ZonePanel zone={mockZone} />)
    expect(screen.getByText(/Clairance/i)).toBeInTheDocument()
  })
})
