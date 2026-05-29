import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { HUD } from './HUD'

interface MockState {
  mapCenter: [number, number] | null
  gpsSpeed: number | null
  gpsHeading: number | null
}

let mockState: MockState

vi.mock('@/store', () => ({
  useAppStore: (selector: (s: MockState) => unknown) => selector(mockState),
}))

describe('HUD', () => {
  beforeEach(() => {
    mockState = { mapCenter: null, gpsSpeed: null, gpsHeading: null }
  })

  it("ne rend rien sans centre ni mouvement", () => {
    render(<HUD />)
    expect(screen.queryByTestId('hud')).not.toBeInTheDocument()
  })

  it('affiche les coordonnées du centre de la carte', () => {
    mockState.mapCenter = [2.3, 46.6]
    render(<HUD />)
    expect(screen.getByTestId('hud')).toBeInTheDocument()
    expect(screen.getByTestId('hud-coords')).toHaveTextContent('46.6000°N 002.3000°E')
  })

  it('affiche le cap et la vitesse sol quand le GPS fournit le mouvement', () => {
    mockState.mapCenter = [2.3, 46.6]
    mockState.gpsSpeed = 25.7   // ≈ 50 kt
    mockState.gpsHeading = 90
    render(<HUD />)
    expect(screen.getByTestId('hud-heading')).toHaveTextContent('090°')
    expect(screen.getByTestId('hud-speed')).toHaveTextContent('50')
    expect(screen.getByTestId('hud-speed')).toHaveTextContent('kt')
  })

  it("masque cap et vitesse quand le GPS ne fournit pas de mouvement", () => {
    mockState.mapCenter = [2.3, 46.6]
    render(<HUD />)
    expect(screen.queryByTestId('hud-heading')).not.toBeInTheDocument()
    expect(screen.queryByTestId('hud-speed')).not.toBeInTheDocument()
  })

  it("rend le HUD avec le mouvement seul (sans centre)", () => {
    mockState.gpsSpeed = 10
    mockState.gpsHeading = 0
    render(<HUD />)
    expect(screen.getByTestId('hud')).toBeInTheDocument()
    expect(screen.getByTestId('hud-speed')).toHaveTextContent('19')
  })
})
