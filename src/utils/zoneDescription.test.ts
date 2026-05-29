import { describe, it, expect } from 'vitest'
import { getZoneDescription, formatAltitude } from './zoneDescription'
import type { AltitudeLimit } from '@/types/airspace'

describe('getZoneDescription', () => {
  it('retourne "Interdit absolu" pour zone P', () => {
    const desc = getZoneDescription('PROHIBITED', null)
    expect(desc.rule).toContain('Interdit')
    expect(desc.color).toBe('red')
    expect(desc.icon).toBe('🚫')
  })

  it('retourne "Clairance obligatoire" pour CTR', () => {
    const desc = getZoneDescription('CTR', 'D')
    expect(desc.rule).toContain('Clairance')
    expect(desc.color).toBe('orange')
  })

  it('retourne "Vol libre" pour classe G', () => {
    const desc = getZoneDescription('CLASS_G', 'G')
    expect(desc.rule).toContain('libre')
    expect(desc.color).toBe('green')
    expect(desc.icon).toBe('✅')
  })

  it('retourne description correcte pour zone R', () => {
    const desc = getZoneDescription('RESTRICTED', null)
    expect(desc.rule).toContain('autorisation')
    expect(desc.color).toBe('red')
  })

  it('retourne description correcte pour zone D', () => {
    const desc = getZoneDescription('DANGER', null)
    expect(desc.color).toBe('purple')
    expect(desc.icon).toBe('⚠️')
  })

  it('retourne description correcte pour parachutage', () => {
    const desc = getZoneDescription('PARACHUTING', null)
    expect(desc.icon).toBe('🪂')
    expect(desc.color).toBe('purple')
  })

  it('retourne interdit pour classe A', () => {
    const desc = getZoneDescription('CLASS_A', 'A')
    expect(desc.rule).toContain('Interdit')
    expect(desc.color).toBe('red')
  })

  it('retourne interdit pour classe B', () => {
    const desc = getZoneDescription('CLASS_B', 'B')
    expect(desc.color).toBe('red')
  })

  it('retourne clairance pour classe C', () => {
    const desc = getZoneDescription('CLASS_C', 'C')
    expect(desc.rule).toContain('Clairance')
    expect(desc.color).toBe('orange')
  })

  it('retourne radio conseillée pour classe E', () => {
    const desc = getZoneDescription('CLASS_E', 'E')
    expect(desc.color).toBe('yellow')
  })

  it('retourne description pour SIV', () => {
    const desc = getZoneDescription('SIV', null)
    expect(desc.color).toBe('blue')
  })

  it('retourne description pour ornithologique', () => {
    const desc = getZoneDescription('ORNITHOLOGICAL', null)
    expect(desc.color).toBe('green')
    expect(desc.icon).toBe('🦅')
  })

  it('couvre tous les types de zones définis', () => {
    const types = [
      'PROHIBITED', 'RESTRICTED', 'DANGER', 'CTR', 'TMA', 'ATZ',
      'SIV', 'PARACHUTING', 'ORNITHOLOGICAL', 'FIR', 'UIR',
    ] as const

    types.forEach((type) => {
      const desc = getZoneDescription(type, null)
      expect(desc.title).toBeTruthy()
      expect(desc.rule).toBeTruthy()
      expect(desc.details).toBeTruthy()
    })
  })
})

describe('formatAltitude', () => {
  it('formate le sol correctement (0 ft AGL)', () => {
    const limit: AltitudeLimit = { value: 0, unit: 'FT', reference: 'AGL' }
    expect(formatAltitude(limit)).toBe('Sol')
  })

  it('formate un Flight Level (nouveau format string)', () => {
    const limit: AltitudeLimit = { value: 65, unit: 'FL', reference: 'STD' }
    expect(formatAltitude(limit)).toBe('FL65')
  })

  it('formate FL115 (TMA AQUITAINE — cas réel)', () => {
    const limit: AltitudeLimit = { value: 115, unit: 'FL', reference: 'STD' }
    expect(formatAltitude(limit)).toBe('FL115')
  })

  it('formate une altitude en pieds AGL', () => {
    const limit: AltitudeLimit = { value: 1000, unit: 'FT', reference: 'AGL' }
    expect(formatAltitude(limit)).toBe('1000 ft AGL')
  })

  it('formate une altitude en pieds AMSL', () => {
    const limit: AltitudeLimit = { value: 3500, unit: 'FT', reference: 'AMSL' }
    expect(formatAltitude(limit)).toBe('3500 ft AMSL')
  })

  // --- Rétrocompatibilité ancien format IndexedDB (unit/reference = code numérique en string) ---

  it("formate FL avec l'ancien format unit='6' (string)", () => {
    // Ancien encodage OpenAIP stocké en IndexedDB avant la migration v2
    const limit = { value: 115, unit: '6', reference: '2' } as unknown as AltitudeLimit
    expect(formatAltitude(limit)).toBe('FL115')
  })

  it("formate FL avec l'ancien format unit=6 (number)", () => {
    const limit = { value: 65, unit: 6, reference: 2 } as unknown as AltitudeLimit
    expect(formatAltitude(limit)).toBe('FL65')
  })

  it("formate Sol avec l'ancien format reference='0' (string)", () => {
    const limit = { value: 0, unit: '1', reference: '0' } as unknown as AltitudeLimit
    expect(formatAltitude(limit)).toBe('Sol')
  })

  it("formate altitude AMSL avec l'ancien format reference='1' (string)", () => {
    const limit = { value: 2000, unit: '1', reference: '1' } as unknown as AltitudeLimit
    expect(formatAltitude(limit)).toBe('2000 ft AMSL')
  })
})
