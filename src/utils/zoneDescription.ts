// Descriptions des zones aériennes en français pour les pilotes ULM

import type { AirspaceType, AirspaceClass, AltitudeLimit } from '@/types/airspace'

export interface ZoneDescription {
  title: string
  rule: string
  details: string
  color: 'green' | 'yellow' | 'orange' | 'red' | 'purple' | 'blue'
  icon: string
}

/**
 * Formate une limite d'altitude en texte lisible.
 *
 * Encodages supportés (l'API OpenAIP v2 et l'ancien format IndexedDB) :
 *   FL : unit === 'FL'  | unit === '6' (string) | unit === 6 (number)
 *   FT : unit === 'FT'  | unit === '1' (string) | unit === 1 (number)
 *  AGL : reference === 'AGL' | 'GND' | '0' (string) | 0 (number)
 * AMSL : reference === 'AMSL' | 'STD' | '1' (string) | 1 (number)
 *  STD : reference === 'STD'  | '2'  (string) | 2 (number)
 */
export function formatAltitude(limit: AltitudeLimit): string {
  // Niveau de vol FL — toutes représentations (string 'FL', string '6', number 6)
  const unitStr = String(limit.unit)
  const isFL = unitStr === 'FL' || unitStr === '6'

  // Sol — plancher à 0, référence AGL / GND / '0' / 0
  const refStr = String(limit.reference)
  const isAGL = refStr === 'AGL' || refStr === 'GND' || refStr === '0'

  if (limit.value === 0 && (isAGL || isFL)) return 'Sol'
  if (isFL) return `FL${limit.value}`

  const ref = isAGL ? 'AGL' : 'AMSL'
  return `${limit.value} ft ${ref}`
}

/**
 * Retourne la description ULM d'une zone aérienne
 */
export function getZoneDescription(
  type: AirspaceType,
  airspaceClass: AirspaceClass | null,
): ZoneDescription {
  switch (type) {
    case 'PROHIBITED':
      return {
        title: 'Zone Interdite (P)',
        rule: 'Interdit absolu — Ne pas entrer',
        details:
          'Vol strictement interdit à tous aéronefs. Sanctions pénales possibles. ' +
          'Inclut les zones militaires sensibles, centrales nucléaires, etc.',
        color: 'red',
        icon: '🚫',
      }

    case 'RESTRICTED':
      return {
        title: 'Zone Réglementée (R)',
        rule: 'Interdit sauf autorisation préalable',
        details:
          'Le survol est possible uniquement avec une autorisation de l\'autorité compétente. ' +
          'Contacter le gestionnaire de la zone avant vol.',
        color: 'red',
        icon: '⛔',
      }

    case 'DANGER':
      return {
        title: 'Zone Dangereuse (D)',
        rule: 'Dangereux — Éviter si activée',
        details:
          'Activités dangereuses en cours ou possibles (tirs, exercices militaires, etc.). ' +
          'Vérifier le NOTAM et l\'activation avant tout survol. Survol possible hors activation.',
        color: 'purple',
        icon: '⚠️',
      }

    case 'CTR':
      return {
        title: 'Zone de Contrôle (CTR)',
        rule: 'Clairance obligatoire',
        details:
          'Espace aérien contrôlé autour d\'un aérodrome. ' +
          'Contact obligatoire avec le contrôle avant entrée. ' +
          'Utiliser la fréquence indiquée.',
        color: 'orange',
        icon: '📡',
      }

    case 'ATZ':
      return {
        title: 'Zone de Trafic d\'Aérodrome (ATZ)',
        rule: 'Contact radio recommandé',
        details:
          'Zone autour d\'un aérodrome. Établir le contact radio avec l\'AFIS ou auto-information. ' +
          'Signaler vos intentions.',
        color: 'orange',
        icon: '📻',
      }

    case 'TMA':
      return {
        title: 'Zone de Contrôle Terminale (TMA)',
        rule: 'Clairance obligatoire',
        details:
          'Espace aérien contrôlé en approche d\'un grand aérodrome. ' +
          'Interdit sans autorisation ATC. Éviter ou contourner.',
        color: 'orange',
        icon: '🛬',
      }

    case 'SIV':
      return {
        title: 'Service d\'Information de Vol (SIV)',
        rule: 'Service optionnel disponible',
        details:
          'Contact radio optionnel mais recommandé. Permet d\'obtenir des informations de trafic. ' +
          'Vol libre, aucune clairance requise.',
        color: 'blue',
        icon: 'ℹ️',
      }

    case 'PARACHUTING':
      return {
        title: 'Zone de Parachutage',
        rule: 'Vigilance — Éviter si activée',
        details:
          'Activité de parachutisme possible. Risque de collision avec des parachutistes. ' +
          'Vérifier l\'activation dans le NOTAM ou AIP.',
        color: 'purple',
        icon: '🪂',
      }

    case 'ORNITHOLOGICAL':
      return {
        title: 'Zone Ornithologique',
        rule: 'Contraintes saisonnières',
        details:
          'Zone de protection avifaune. Restrictions saisonnières possibles. ' +
          'Consulter l\'AIP France pour les périodes de restriction.',
        color: 'green',
        icon: '🦅',
      }

    case 'FIR':
    case 'UIR':
      return {
        title: type === 'FIR' ? 'Région d\'Information de Vol (FIR)' : 'Région Supérieure d\'Information (UIR)',
        rule: 'Information de vol disponible',
        details:
          'Zone de couverture du service d\'information de vol. ' +
          'Contact avec le FIR Paris pour informations météo et trafic.',
        color: 'blue',
        icon: '🗺️',
      }

    default:
      // Selon la classe OACI
      if (airspaceClass === 'A' || airspaceClass === 'B') {
        return {
          title: `Espace Aérien Classe ${airspaceClass}`,
          rule: 'Interdit ULM',
          details:
            'Espace aérien à haute densité de trafic IFR. ' +
            'Les ULM (et VFR en général) ne peuvent pas y évoluer.',
          color: 'red',
          icon: '🚫',
        }
      }

      if (airspaceClass === 'C') {
        return {
          title: 'Espace Aérien Classe C',
          rule: 'Clairance obligatoire',
          details:
            'Espace contrôlé mixte IFR/VFR. ' +
            'Clairance ATC obligatoire, équipement radio et transpondeur requis.',
          color: 'orange',
          icon: '📡',
        }
      }

      if (airspaceClass === 'D') {
        return {
          title: 'Espace Aérien Classe D',
          rule: 'Clairance et contact radio obligatoires',
          details:
            'CTR ou TMA classe D. Contact obligatoire avec l\'ATC avant entrée. ' +
            'Transpondeur et radio obligatoires.',
          color: 'orange',
          icon: '📻',
        }
      }

      if (airspaceClass === 'E') {
        return {
          title: 'Espace Aérien Classe E',
          rule: 'VFR sans clairance, radio conseillée',
          details:
            'Vol VFR autorisé sans clairance. Contact radio avec le FIR conseillé. ' +
            'Présence de trafic IFR possible — maintenir la vigilance.',
          color: 'yellow',
          icon: '📶',
        }
      }

      if (airspaceClass === 'G') {
        return {
          title: 'Espace Aérien Classe G',
          rule: '✅ Vol libre (VFR)',
          details:
            'Espace aérien non contrôlé. Vol ULM autorisé sans contact radio obligatoire. ' +
            'Règles VFR applicables. Altitude maximale : 1000 ft AGL en général.',
          color: 'green',
          icon: '✅',
        }
      }

      return {
        title: 'Zone Aérienne',
        rule: 'Consulter l\'AIP France',
        details: 'Vérifier les conditions de pénétration dans l\'AIP et les NOTAM.',
        color: 'blue',
        icon: '❓',
      }
  }
}
