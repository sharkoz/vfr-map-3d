import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LayerControl } from './LayerControl'
import { DEFAULT_FILTERS } from '@/types/airspace'

const mockSetFilter             = vi.fn()
const mockResetFilters          = vi.fn()
const mockToggleAirports        = vi.fn()
const mockTogglePrivateAirports = vi.fn()

vi.mock('@/store', () => ({
  useAppStore: vi.fn((selector) => {
    const state = {
      filters:               { ...DEFAULT_FILTERS },
      setFilter:             mockSetFilter,
      resetFilters:          mockResetFilters,
      showAirports:          true,
      toggleAirports:        mockToggleAirports,
      showPrivateAirports:   false,
      togglePrivateAirports: mockTogglePrivateAirports,
    }
    return selector(state)
  }),
}))

describe('LayerControl', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── Rendering ──────────────────────────────────────────────────────────────

  it('rend le composant', () => {
    render(<LayerControl />)
    expect(screen.getByTestId('layer-control')).toBeInTheDocument()
  })

  it('affiche tous les groupes de couches', () => {
    render(<LayerControl />)
    expect(screen.getByLabelText(/Masquer Classe G|Afficher Classe G/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Masquer CTR|Afficher CTR/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Masquer Zone P|Afficher Zone P/)).toBeInTheDocument()
  })

  it('affiche le toggle aérodromes', () => {
    render(<LayerControl />)
    expect(screen.getByTestId('airports-toggle')).toBeInTheDocument()
    expect(screen.getByText('Aérodromes')).toBeInTheDocument()
  })

  // ── Interactions ───────────────────────────────────────────────────────────

  it('toggle un filtre au clic', () => {
    render(<LayerControl />)
    const classGBtn = screen.getByLabelText('Masquer Classe G')
    fireEvent.click(classGBtn)
    expect(mockSetFilter).toHaveBeenCalledWith('showClassG', false)
  })

  it('réinitialise les filtres', () => {
    render(<LayerControl />)
    fireEvent.click(screen.getByText('Tout afficher'))
    expect(mockResetFilters).toHaveBeenCalled()
  })

  it('affiche le bouton comme actif quand filtre activé', () => {
    render(<LayerControl />)
    const btn = screen.getByLabelText('Masquer Classe G')
    expect(btn).toHaveAttribute('aria-pressed', 'true')
  })

  it('toggle les aérodromes au clic', () => {
    render(<LayerControl />)
    fireEvent.click(screen.getByTestId('airports-toggle'))
    expect(mockToggleAirports).toHaveBeenCalled()
  })

  it('affiche le toggle aérodromes comme actif quand showAirports=true', () => {
    render(<LayerControl />)
    expect(screen.getByTestId('airports-toggle')).toHaveAttribute('aria-pressed', 'true')
  })
})
