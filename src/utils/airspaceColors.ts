// Couleurs OACI par classe/type d'espace aérien

import type { AirspaceType, AirspaceClass } from '@/types/airspace'

export interface AirspaceColorConfig {
  fill: string
  fillOpacity: number
  stroke: string
  strokeOpacity: number
  strokeWidth: number
}

const COLORS: Record<string, AirspaceColorConfig> = {
  G: {
    fill: '#22c55e',
    fillOpacity: 0.15,
    stroke: '#16a34a',
    strokeOpacity: 0.8,
    strokeWidth: 1,
  },
  E: {
    fill: '#fbbf24',
    fillOpacity: 0.15,
    stroke: '#d97706',
    strokeOpacity: 0.8,
    strokeWidth: 1,
  },
  D: {
    fill: '#f97316',
    fillOpacity: 0.2,
    stroke: '#ea580c',
    strokeOpacity: 0.9,
    strokeWidth: 1.5,
  },
  C: {
    fill: '#f97316',
    fillOpacity: 0.25,
    stroke: '#c2410c',
    strokeOpacity: 0.9,
    strokeWidth: 2,
  },
  B: {
    fill: '#ef4444',
    fillOpacity: 0.3,
    stroke: '#b91c1c',
    strokeOpacity: 1,
    strokeWidth: 2,
  },
  A: {
    fill: '#ef4444',
    fillOpacity: 0.35,
    stroke: '#991b1b',
    strokeOpacity: 1,
    strokeWidth: 2,
  },
  PROHIBITED: {
    fill: '#dc2626',
    fillOpacity: 0.4,
    stroke: '#991b1b',
    strokeOpacity: 1,
    strokeWidth: 2.5,
  },
  RESTRICTED: {
    fill: '#f87171',
    fillOpacity: 0.3,
    stroke: '#dc2626',
    strokeOpacity: 0.9,
    strokeWidth: 2,
  },
  DANGER: {
    fill: '#d946ef',
    fillOpacity: 0.25,
    stroke: '#a21caf',
    strokeOpacity: 0.9,
    strokeWidth: 2,
  },
  SIV: {
    fill: '#60a5fa',
    fillOpacity: 0.15,
    stroke: '#2563eb',
    strokeOpacity: 0.7,
    strokeWidth: 1,
  },
  PARACHUTING: {
    fill: '#a855f7',
    fillOpacity: 0.2,
    stroke: '#7c3aed',
    strokeOpacity: 0.8,
    strokeWidth: 1.5,
  },
  ORNITHOLOGICAL: {
    fill: '#15803d',
    fillOpacity: 0.2,
    stroke: '#166534',
    strokeOpacity: 0.8,
    strokeWidth: 1,
  },
  DEFAULT: {
    fill: '#94a3b8',
    fillOpacity: 0.15,
    stroke: '#64748b',
    strokeOpacity: 0.7,
    strokeWidth: 1,
  },
}

/**
 * Retourne la configuration de couleur pour un espace aérien
 * selon son type et sa classe OACI.
 */
export function getZoneColor(
  type: AirspaceType,
  airspaceClass: AirspaceClass | null,
): AirspaceColorConfig {
  // Types spéciaux en priorité
  if (type === 'PROHIBITED') return COLORS.PROHIBITED
  if (type === 'RESTRICTED') return COLORS.RESTRICTED
  if (type === 'DANGER') return COLORS.DANGER
  if (type === 'SIV') return COLORS.SIV
  if (type === 'PARACHUTING') return COLORS.PARACHUTING
  if (type === 'ORNITHOLOGICAL') return COLORS.ORNITHOLOGICAL

  // Selon la classe OACI
  if (airspaceClass && COLORS[airspaceClass]) {
    return COLORS[airspaceClass]
  }

  // Fallback selon le type
  if (type === 'CTR' || type === 'ATZ') return COLORS.D
  if (type === 'TMA') return COLORS.C

  return COLORS.DEFAULT
}

/**
 * Retourne la couleur de remplissage CSS pour un usage direct
 */
export function getZoneFillColor(
  type: AirspaceType,
  airspaceClass: AirspaceClass | null,
): string {
  return getZoneColor(type, airspaceClass).fill
}
