/**
 * Utilitaires de formatage géographique pour le HUD (mesures & outils).
 * Code en anglais, sorties destinées à l'UI française.
 */

const MS_TO_KNOTS = 1.943_844_49 // 1 m/s = 1.94384 nœuds

/** Convertit une vitesse de m/s en nœuds (arrondi entier). */
export function msToKnots(speedMs: number | null | undefined): number | null {
  if (speedMs == null || Number.isNaN(speedMs) || speedMs < 0) return null
  return Math.round(speedMs * MS_TO_KNOTS)
}

/**
 * Formate un cap en chaîne sur 3 chiffres avec le symbole degré (ex: 45 → "045°").
 * Normalise dans [0, 360).
 */
export function formatHeading(headingDeg: number | null | undefined): string | null {
  if (headingDeg == null || Number.isNaN(headingDeg)) return null
  const normalized = ((Math.round(headingDeg) % 360) + 360) % 360
  return `${String(normalized).padStart(3, '0')}°`
}

/**
 * Formate une coordonnée (lon, lat) en degrés décimaux avec hémisphères.
 * Ex: [2.3, 46.6] → "46.6000°N 002.3000°E"
 */
export function formatLatLon(lon: number, lat: number): string {
  const ns = lat >= 0 ? 'N' : 'S'
  const ew = lon >= 0 ? 'E' : 'W'
  const latStr = Math.abs(lat).toFixed(4)
  const lonStr = Math.abs(lon).toFixed(4).padStart(8, '0') // 3 chiffres avant la virgule
  return `${latStr}°${ns} ${lonStr}°${ew}`
}
