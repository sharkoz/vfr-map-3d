import { describe, it, expect } from 'vitest'
import { msToKnots, formatHeading, formatLatLon, circlePolygon } from './geoFormat'

describe('msToKnots', () => {
  it('convertit m/s en nœuds (arrondi)', () => {
    expect(msToKnots(10)).toBe(19)   // 10 m/s ≈ 19.4 kt
    expect(msToKnots(0)).toBe(0)
    expect(msToKnots(25.7)).toBe(50) // ≈ 49.96 kt
  })

  it('retourne null pour valeur absente ou invalide', () => {
    expect(msToKnots(null)).toBeNull()
    expect(msToKnots(undefined)).toBeNull()
    expect(msToKnots(NaN)).toBeNull()
    expect(msToKnots(-5)).toBeNull()
  })
})

describe('formatHeading', () => {
  it('formate sur 3 chiffres avec symbole degré', () => {
    expect(formatHeading(45)).toBe('045°')
    expect(formatHeading(0)).toBe('000°')
    expect(formatHeading(359)).toBe('359°')
    expect(formatHeading(180.4)).toBe('180°')
  })

  it('normalise dans [0, 360)', () => {
    expect(formatHeading(360)).toBe('000°')
    expect(formatHeading(450)).toBe('090°')
    expect(formatHeading(-90)).toBe('270°')
  })

  it('retourne null pour valeur absente ou invalide', () => {
    expect(formatHeading(null)).toBeNull()
    expect(formatHeading(undefined)).toBeNull()
    expect(formatHeading(NaN)).toBeNull()
  })
})

describe('formatLatLon', () => {
  it('formate avec hémisphères N/E', () => {
    expect(formatLatLon(2.3, 46.6)).toBe('46.6000°N 002.3000°E')
  })

  it('gère les hémisphères S/W', () => {
    expect(formatLatLon(-122.4194, -33.8688)).toBe('33.8688°S 122.4194°W')
  })

  it('remplit les coordonnées sur 3 chiffres avant la virgule', () => {
    expect(formatLatLon(5, 9)).toBe('9.0000°N 005.0000°E')
  })
})

describe('circlePolygon', () => {
  it('produit un anneau fermé avec steps+1 sommets', () => {
    const poly = circlePolygon(2.3, 46.6, 100, 32)
    const ring = poly.geometry.coordinates[0]
    expect(ring).toHaveLength(33) // 32 segments + point de fermeture
    expect(ring[0]).toEqual(ring[ring.length - 1]) // anneau fermé
  })

  it('centre le polygone et respecte le rayon en latitude', () => {
    const radius = 111_320 // ~1° de latitude
    const poly = circlePolygon(0, 0, radius, 4)
    const ring = poly.geometry.coordinates[0]
    // À theta=90° (i=1 sur 4) → point au nord, lat ≈ +1°
    expect(ring[1][1]).toBeCloseTo(1, 3)
    expect(ring[1][0]).toBeCloseTo(0, 6)
  })
})
