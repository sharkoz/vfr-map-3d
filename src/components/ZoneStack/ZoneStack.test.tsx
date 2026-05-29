import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ZoneStack, toFeet, feetLabel, getAltTicks } from './ZoneStack'
import type { AirspaceFeature } from '@/types/airspace'

const mockSetZoneStack       = vi.fn()
const mockSetHighlightedZoneId = vi.fn()

// ── Zone factories ──────────────────────────────────────────────────────────

const makeZone = (
  overrides: Partial<AirspaceFeature['properties']> & { id?: string },
): AirspaceFeature => ({
  type: 'Feature',
  geometry: { type: 'Polygon', coordinates: [] },
  properties: {
    id:         overrides.id ?? 'zone-1',
    name:       overrides.name ?? 'Zone Test',
    type:       overrides.type ?? 'CTR',
    class:      overrides.class ?? 'D',
    lowerLimit: overrides.lowerLimit ?? { value: 0,    unit: 'FT', reference: 'AGL'  },
    upperLimit: overrides.upperLimit ?? { value: 2500, unit: 'FT', reference: 'AGL'  },
    country:    overrides.country ?? 'FR',
    frequency:  overrides.frequency,
    callsign:   overrides.callsign,
  },
})

const zoneCTR: AirspaceFeature = makeZone({
  id: 'ctr-1', name: 'CTR BORDEAUX', type: 'CTR', class: 'D',
  lowerLimit: { value: 0,    unit: 'FT', reference: 'AGL'  },
  upperLimit: { value: 2500, unit: 'FT', reference: 'AGL'  },
  frequency: '119.200', callsign: 'BORDEAUX APP',
})

const zoneTMA: AirspaceFeature = makeZone({
  id: 'tma-1', name: 'TMA AQUITAINE 2.1', type: 'TMA', class: 'D',
  lowerLimit: { value: 2000, unit: 'FT',  reference: 'AMSL' },
  upperLimit: { value: 115,  unit: 'FL',  reference: 'STD'  },
})

const zoneG: AirspaceFeature = makeZone({
  id: 'g-1', name: 'Classe G', type: 'CLASS_G', class: 'G',
  lowerLimit: { value: 0,   unit: 'FT', reference: 'AGL' },
  upperLimit: { value: 600, unit: 'FT', reference: 'AGL' },
})

// ── Store mock ──────────────────────────────────────────────────────────────

vi.mock('@/store', () => ({
  useAppStore: vi.fn(),
}))

async function mockStore(
  zoneStack: AirspaceFeature[] | null,
  userCeiling = 3500,
) {
  const { useAppStore } = await import('@/store')
  vi.mocked(useAppStore).mockImplementation((selector) =>
    selector({
      zoneStack,
      setZoneStack:          mockSetZoneStack,
      userCeiling,
      highlightedZoneId:     null,
      setHighlightedZoneId:  mockSetHighlightedZoneId,
    } as never),
  )
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('ZoneStack', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    // Default state: 3 zones, ceiling 3500 ft (all visible)
    await mockStore([zoneCTR, zoneTMA, zoneG])
  })

  // ── Panel rendering ───────────────────────────────────────────────────────

  it("n'affiche rien quand zoneStack est null", async () => {
    await mockStore(null)
    const { container } = render(<ZoneStack />)
    expect(container).toBeEmptyDOMElement()
  })

  it("n'affiche rien quand zoneStack est vide", async () => {
    await mockStore([])
    const { container } = render(<ZoneStack />)
    expect(container).toBeEmptyDOMElement()
  })

  it('affiche le panneau avec les zones', () => {
    render(<ZoneStack />)
    expect(screen.getByTestId('zone-stack-panel')).toBeInTheDocument()
    expect(screen.getByText('3 couches à cette position')).toBeInTheDocument()
  })

  it('affiche les noms des zones', () => {
    render(<ZoneStack />)
    expect(screen.getByText('CTR BORDEAUX')).toBeInTheDocument()
    expect(screen.getByText('TMA AQUITAINE 2.1')).toBeInTheDocument()
    expect(screen.getByText('Classe G')).toBeInTheDocument()
  })

  it('affiche le titre du panneau', () => {
    render(<ZoneStack />)
    expect(screen.getByText('Espaces aériens')).toBeInTheDocument()
  })

  it('affiche le type de zone', () => {
    render(<ZoneStack />)
    expect(screen.getByText('Zone de Contrôle (CTR)')).toBeInTheDocument()
    expect(screen.getByText('Zone de Contrôle Terminale (TMA)')).toBeInTheDocument()
  })

  // ── Sorting ───────────────────────────────────────────────────────────────

  it('trie les zones par plancher ascendant (altitude la plus basse en premier)', () => {
    render(<ZoneStack />)
    const items = screen.getAllByTestId('zone-stack-item')
    const tmaIndex = items.findIndex(el => el.textContent?.includes('TMA AQUITAINE'))
    const gIndex   = items.findIndex(el => el.textContent?.includes('Classe G'))
    expect(gIndex).toBeLessThan(tmaIndex)
  })

  // ── Altitude display ──────────────────────────────────────────────────────

  it('affiche les altitudes plancher et plafond', () => {
    render(<ZoneStack />)
    expect(screen.getAllByText('Sol').length).toBeGreaterThan(0)
    expect(screen.getAllByText('2500 ft AGL').length).toBeGreaterThan(0)
    expect(screen.getByText('2000 ft AMSL')).toBeInTheDocument()
    expect(screen.getByText('FL115')).toBeInTheDocument()
  })

  // ── Frequency ────────────────────────────────────────────────────────────

  it("affiche la fréquence et l'indicatif quand présents", () => {
    render(<ZoneStack />)
    // frequency "119.200" and " MHz" are in separate text nodes within a <p> — check that <p>
    expect(screen.getByText((_, el) =>
      el?.tagName === 'P' &&
      ((el?.textContent?.includes('119.200') && el?.textContent?.includes('MHz')) ?? false)
    )).toBeInTheDocument()
    expect(screen.getByText(/BORDEAUX APP/)).toBeInTheDocument()
  })

  // ── Class badge ───────────────────────────────────────────────────────────

  it('affiche les badges de classe', () => {
    render(<ZoneStack />)
    const classBadges = screen.getAllByText('D')
    expect(classBadges.length).toBeGreaterThan(0)
  })

  // ── Close interactions ────────────────────────────────────────────────────

  it('ferme au clic sur le bouton fermer', () => {
    render(<ZoneStack />)
    fireEvent.click(screen.getByLabelText('Fermer'))
    expect(mockSetZoneStack).toHaveBeenCalledWith(null)
  })

  it('efface la surbrillance en fermant le panneau', () => {
    render(<ZoneStack />)
    fireEvent.click(screen.getByLabelText('Fermer'))
    expect(mockSetHighlightedZoneId).toHaveBeenCalledWith(null)
  })

  it('ferme à la touche Escape', () => {
    render(<ZoneStack />)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(mockSetZoneStack).toHaveBeenCalledWith(null)
  })

  // ── Highlighting ──────────────────────────────────────────────────────────

  it('active la surbrillance au clic sur un item de zone', () => {
    render(<ZoneStack />)
    const items = screen.getAllByTestId('zone-stack-item')
    fireEvent.click(items[0])
    expect(mockSetHighlightedZoneId).toHaveBeenCalled()
  })

  it('item a aria-pressed=false quand non sélectionné', () => {
    render(<ZoneStack />)
    const items = screen.getAllByTestId('zone-stack-item')
    expect(items[0]).toHaveAttribute('aria-pressed', 'false')
  })

  // ── Ceiling filtering ─────────────────────────────────────────────────────

  it('masque les zones dont le plancher est au-dessus du plafond', async () => {
    // Ceiling 500 ft → TMA (floor 2000 ft) is hidden; CTR and G (floor 0) remain
    await mockStore([zoneCTR, zoneTMA, zoneG], 500)
    render(<ZoneStack />)
    expect(screen.queryByText('TMA AQUITAINE 2.1')).not.toBeInTheDocument()
    expect(screen.getByText('CTR BORDEAUX')).toBeInTheDocument()
    expect(screen.getByText('Classe G')).toBeInTheDocument()
  })

  it('affiche le nombre de zones masquées au-dessus du plafond', async () => {
    await mockStore([zoneCTR, zoneTMA, zoneG], 500)
    render(<ZoneStack />)
    expect(screen.getByTestId('hidden-zones-notice')).toBeInTheDocument()
    expect(screen.getByTestId('hidden-zones-notice')).toHaveTextContent('+1 zone')
  })

  it('met à jour le compteur avec les zones visibles seulement', async () => {
    await mockStore([zoneCTR, zoneTMA, zoneG], 500)
    render(<ZoneStack />)
    expect(screen.getByText('2 couches à cette position')).toBeInTheDocument()
  })

  it("n'affiche pas l'avis de zones masquées quand aucune n'est filtrée", () => {
    render(<ZoneStack />)
    expect(screen.queryByTestId('hidden-zones-notice')).not.toBeInTheDocument()
  })

  // ── Altitude chart ────────────────────────────────────────────────────────

  it('affiche le graphique altitude quand des zones sont visibles', () => {
    render(<ZoneStack />)
    expect(screen.getByTestId('altitude-chart')).toBeInTheDocument()
  })

  it('affiche une barre par zone visible dans le graphique', () => {
    render(<ZoneStack />)
    expect(screen.getByTestId('chart-bar-1')).toBeInTheDocument()
    expect(screen.getByTestId('chart-bar-2')).toBeInTheDocument()
    expect(screen.getByTestId('chart-bar-3')).toBeInTheDocument()
  })

  it("n'affiche pas le graphique quand toutes les zones sont masquées", async () => {
    // All zones have floor >= ceiling
    const highZone = makeZone({
      id: 'high-1', name: 'Zone haute',
      lowerLimit: { value: 5000, unit: 'FT', reference: 'AMSL' },
      upperLimit: { value: 8000, unit: 'FT', reference: 'AMSL' },
    })
    await mockStore([highZone], 500)
    render(<ZoneStack />)
    expect(screen.queryByTestId('altitude-chart')).not.toBeInTheDocument()
  })
})

// ── Unit tests for altitude utilities ─────────────────────────────────────

describe('toFeet', () => {
  it('convertit les FL en pieds (× 100)', () => {
    expect(toFeet({ value: 115, unit: 'FL', reference: 'STD' })).toBe(11500)
    expect(toFeet({ value: 65,  unit: 'FL', reference: 'STD' })).toBe(6500)
  })

  it('convertit les FL via code numérique legacy ("6")', () => {
    expect(toFeet({ value: 100, unit: '6' as never, reference: 'STD' })).toBe(10000)
  })

  it('retourne la valeur brute pour les FT', () => {
    expect(toFeet({ value: 2500, unit: 'FT', reference: 'AGL' })).toBe(2500)
    expect(toFeet({ value: 0,    unit: 'FT', reference: 'AGL' })).toBe(0)
  })
})

describe('feetLabel', () => {
  it('retourne "Sol" pour 0 ft ou moins', () => {
    expect(feetLabel(0)).toBe('Sol')
    expect(feetLabel(-100)).toBe('Sol')
  })

  it('retourne "X ft" pour les altitudes basses', () => {
    expect(feetLabel(500)).toBe('500 ft')
    expect(feetLabel(3500)).toBe('3500 ft')
    expect(feetLabel(5000)).toBe('5000 ft')
  })

  it('retourne "FL XX" pour les altitudes >= 5500 ft', () => {
    expect(feetLabel(5500)).toBe('FL55')
    expect(feetLabel(10000)).toBe('FL100')
    expect(feetLabel(19500)).toBe('FL195')
  })
})

describe('getAltTicks', () => {
  it('retourne des graduations de 500 ft pour un plafond ≤ 2000', () => {
    const ticks = getAltTicks(2000)
    expect(ticks).toContain(0)
    expect(ticks).toContain(500)
    expect(ticks).toContain(1000)
    expect(ticks).toContain(2000)
  })

  it('retourne des graduations de 1000 ft pour un plafond entre 2000 et 6000', () => {
    const ticks = getAltTicks(5000)
    expect(ticks).toContain(0)
    expect(ticks).toContain(1000)
    expect(ticks).toContain(5000)
    expect(ticks).not.toContain(500)
  })

  it('commence toujours à 0', () => {
    expect(getAltTicks(3500)[0]).toBe(0)
    expect(getAltTicks(10000)[0]).toBe(0)
  })
})
