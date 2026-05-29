import { describe, it, expect } from 'vitest'
import { getZoneColor, getZoneFillColor } from './airspaceColors'

describe('getZoneColor', () => {
  it('retourne vert pour la classe G', () => {
    const color = getZoneColor('CLASS_G', 'G')
    expect(color.fill).toBe('#22c55e')
  })

  it('retourne jaune pour la classe E', () => {
    const color = getZoneColor('CLASS_E', 'E')
    expect(color.fill).toBe('#fbbf24')
  })

  it('retourne orange pour CTR (classe D)', () => {
    const color = getZoneColor('CTR', 'D')
    expect(color.fill).toBe('#f97316')
  })

  it('retourne rouge vif pour zone P (PROHIBITED)', () => {
    const color = getZoneColor('PROHIBITED', null)
    expect(color.fill).toBe('#dc2626')
    expect(color.fillOpacity).toBeGreaterThan(0.3)
  })

  it('retourne rouge pour zone R (RESTRICTED)', () => {
    const color = getZoneColor('RESTRICTED', null)
    expect(color.fill).toBe('#f87171')
  })

  it('retourne magenta pour zone D (DANGER)', () => {
    const color = getZoneColor('DANGER', null)
    expect(color.fill).toBe('#d946ef')
  })

  it('retourne bleu clair pour SIV', () => {
    const color = getZoneColor('SIV', null)
    expect(color.fill).toBe('#60a5fa')
  })

  it('retourne violet pour parachutage', () => {
    const color = getZoneColor('PARACHUTING', null)
    expect(color.fill).toBe('#a855f7')
  })

  it('retourne vert foncé pour ornithologique', () => {
    const color = getZoneColor('ORNITHOLOGICAL', null)
    expect(color.fill).toBe('#15803d')
  })

  it('retourne rouge foncé pour classe A', () => {
    const color = getZoneColor('CLASS_A', 'A')
    expect(color.fill).toBe('#ef4444')
  })

  it('retourne la couleur par défaut pour un type inconnu', () => {
    const color = getZoneColor('OTHER', null)
    expect(color.fill).toBe('#94a3b8')
  })

  it('CTR sans classe utilise la couleur D par défaut', () => {
    const color = getZoneColor('CTR', null)
    expect(color.fill).toBe('#f97316')
  })
})

describe('getZoneFillColor', () => {
  it('retourne une chaîne de couleur CSS valide', () => {
    const color = getZoneFillColor('PROHIBITED', null)
    expect(color).toMatch(/^#[0-9a-f]{6}$/i)
  })
})
