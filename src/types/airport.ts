// Types pour les aérodromes et terrains ULM

export type AirportType =
  | 'AIRPORT'       // Aéroport civil (contrôlé, régional ou international)
  | 'GLIDER'        // Site de vol à voile
  | 'AIRFIELD'      // Terrain non-contrôlé
  | 'CIVIL'         // Aérodrome civil
  | 'MILITARY'      // Base militaire
  | 'HELIPORT'      // Hélistation
  | 'ULTRA_LIGHT'   // Terrain ULM
  | 'SEAPLANE'      // Hydrobase
  | 'PRIVATE'       // Terrain privé (club, ferme, PPR) — type=6 OpenAIP
  | 'OTHER'

export type SurfaceType =
  | 'ASPHALT'
  | 'CONCRETE'
  | 'GRASS'
  | 'GRAVEL'
  | 'WATER'
  | 'OTHER'

export interface AirportFrequency {
  value: string        // ex: "118.100"
  type:  number        // Type OpenAIP (voir FREQUENCY_TYPE_LABELS)
  name:  string        // Nom de la fréquence (ex: "TOWER", "A/A")
}

export interface AirportRunway {
  designator: string   // Indicatif piste (ex: "13", "31L")
  trueHdg:    number   // Cap vrai (degrés)
  length:     number   // Longueur en mètres (0 = non renseigné)
  surface:    SurfaceType
}

export interface AirportProperties {
  id:          string
  name:        string
  icaoCode:    string | null
  iataCode:    string | null
  type:        AirportType
  elevation:   number          // Altitude en pieds AMSL
  private:     boolean         // Terrain privé (accès restreint)
  ppr:         boolean         // Prior Permission Required
  frequencies: AirportFrequency[]
  runways:     AirportRunway[]
  country:     string
}

export interface AirportFeature extends GeoJSON.Feature<GeoJSON.Point, AirportProperties> {
  type: 'Feature'
}

export interface AirportCollection extends GeoJSON.FeatureCollection<GeoJSON.Point, AirportProperties> {
  type: 'FeatureCollection'
  features: AirportFeature[]
}

// Mapping type → couleur hex (pour les couches MapLibre et l'UI)
export const AIRPORT_COLORS: Record<AirportType, string> = {
  AIRPORT:     '#1d4ed8',  // bleu foncé
  CIVIL:       '#2563eb',  // bleu
  AIRFIELD:    '#3b82f6',  // bleu clair
  ULTRA_LIGHT: '#16a34a',  // vert
  GLIDER:      '#ca8a04',  // jaune-doré
  MILITARY:    '#dc2626',  // rouge
  HELIPORT:    '#7c3aed',  // violet
  SEAPLANE:    '#0ea5e9',  // cyan
  PRIVATE:     '#d97706',  // ambre/orange — privé, PPR
  OTHER:       '#6b7280',  // gris
}

// Labels français par type
export const AIRPORT_TYPE_LABELS: Record<AirportType, string> = {
  AIRPORT:     'Aéroport',
  CIVIL:       'Aérodrome',
  AIRFIELD:    'Terrain',
  ULTRA_LIGHT: 'Terrain ULM',
  GLIDER:      'Vol à voile',
  MILITARY:    'Base militaire',
  HELIPORT:    'Hélistation',
  SEAPLANE:    'Hydrobase',
  PRIVATE:     'Terrain privé',
  OTHER:       'Autre',
}

// Icônes emoji par type (pour l'UI)
export const AIRPORT_TYPE_ICONS: Record<AirportType, string> = {
  AIRPORT:     '✈️',
  CIVIL:       '✈️',
  AIRFIELD:    '🛬',
  ULTRA_LIGHT: '🛩️',
  GLIDER:      '🪂',
  MILITARY:    '🪖',
  HELIPORT:    '🚁',
  SEAPLANE:    '🌊',
  PRIVATE:     '🔒',
  OTHER:       '📍',
}

// Labels des types de fréquences (valeurs réelles observées sur l'API OpenAIP France)
export const FREQUENCY_TYPE_LABELS: Record<number, string> = {
  0:  'APP',     // Approach
  5:  'Clrnce',  // Clearance/Delivery
  7:  'FIS',     // Flight Information Service
  9:  'Sol',     // Ground
  10: 'AFIS',    // Aerodrome Flight Information Service
  12: 'A/A',     // Air-to-Air
  13: 'APP',     // Approach (variante)
  14: 'Tour',    // Tower (TWR)
  15: 'ATIS',    // ATIS
  16: 'A/A',     // Air-to-Air (code secondaire)
  17: 'OPS',     // Opérations / SAMU
  22: 'Info',    // Information
}
