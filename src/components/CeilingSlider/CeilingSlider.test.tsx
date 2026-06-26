import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CeilingSlider } from './CeilingSlider'

const mockSetUserCeiling = vi.fn()

vi.mock('@/store', () => ({
  useAppStore: vi.fn((selector) =>
    selector({
      userCeiling: 900,
      setUserCeiling: mockSetUserCeiling,
    }),
  ),
}))

describe('CeilingSlider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rend le contrôle de plafond', () => {
    render(<CeilingSlider />)
    expect(screen.getByTestId('ceiling-control')).toBeInTheDocument()
    expect(screen.getByTestId('ceiling-slider')).toBeInTheDocument()
  })

  it('affiche la valeur du plafond par défaut (900 → "900 ft")', () => {
    render(<CeilingSlider />)
    expect(screen.getByTestId('ceiling-value')).toHaveTextContent('900 ft')
  })

  it('affiche "500 ft" au minimum', async () => {
    const { useAppStore } = await import('@/store')
    vi.mocked(useAppStore).mockImplementation((selector) =>
      selector({ userCeiling: 500, setUserCeiling: mockSetUserCeiling } as never),
    )
    render(<CeilingSlider />)
    expect(screen.getByTestId('ceiling-value')).toHaveTextContent('500 ft')
  })

  it('affiche la valeur FL pour un plafond élevé', async () => {
    const { useAppStore } = await import('@/store')
    vi.mocked(useAppStore).mockImplementation((selector) =>
      selector({ userCeiling: 10000, setUserCeiling: mockSetUserCeiling } as never),
    )
    render(<CeilingSlider />)
    expect(screen.getByTestId('ceiling-value')).toHaveTextContent('FL100')
  })

  it('appelle setUserCeiling au changement du slider', () => {
    render(<CeilingSlider />)
    fireEvent.change(screen.getByTestId('ceiling-slider'), { target: { value: '1500' } })
    expect(mockSetUserCeiling).toHaveBeenCalledWith(1500)
  })

  it('le slider va de 500 ft à FL195 (19500), pas de 100 ft', () => {
    render(<CeilingSlider />)
    const slider = screen.getByTestId('ceiling-slider')
    expect(slider).toHaveAttribute('min', '500')
    expect(slider).toHaveAttribute('max', '19500')
    expect(slider).toHaveAttribute('step', '100')
  })
})
