// Types pour les espaces aériens VFR France

export type AirspaceClass = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G'

export type AirspaceType =
  | 'CTR'
  | 'TMA'
  | 'CLASS_A'
  | 'CLASS_B'
  | 'CLASS_C'
  | 'CLASS_D'
  | 'CLASS_E'
  | 'CLASS_F'
  | 'CLASS_G'
  | 'PROHIBITED'  // Zone P
  | 'RESTRICTED'  // Zone R
  | 'DANGER'      // Zone D
  | 'SIV'
  | 'PARACHUTING'
  | 'ORNITHOLOGICAL'
  | 'FIR'
  | 'UIR'
  | 'ADSIZ'
  | 'ATZ'
  | 'OTHER'

export interface AltitudeLimit {
  value: number
  unit: 'FT' | 'FL' | 'M'
  reference: 'AGL' | 'AMSL' | 'STD'
}

export interface AirspaceProperties {
  id: string
  name: string
  type: AirspaceType
  class: AirspaceClass | null
  lowerLimit: AltitudeLimit
  upperLimit: AltitudeLimit
  activity?: string
  frequency?: string
  callsign?: string
  description?: string
  country: string
  // OpenAIP raw type code
  rawType?: number
}

export interface AirspaceFeature extends GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon, AirspaceProperties> {
  type: 'Feature'
}

export interface AirspaceCollection extends GeoJSON.FeatureCollection<GeoJSON.Polygon | GeoJSON.MultiPolygon, AirspaceProperties> {
  type: 'FeatureCollection'
  features: AirspaceFeature[]
}

// Filtres actifs sur la carte
export interface AirspaceFilters {
  showClassG: boolean
  showClassE: boolean
  showCTR: boolean
  showTMA: boolean
  showClassAB: boolean
  showProhibited: boolean
  showRestricted: boolean
  showDanger: boolean
  showSIV: boolean
  showParachuting: boolean
  showOrnithological: boolean
  maxAltitude: number // en pieds
}

export const DEFAULT_FILTERS: AirspaceFilters = {
  showClassG: true,
  showClassE: true,
  showCTR: true,
  showTMA: true,
  showClassAB: true,
  showProhibited: true,
  showRestricted: true,
  showDanger: true,
  showSIV: true,
  showParachuting: true,
  showOrnithological: true,
  maxAltitude: 5000,
}
