import { useAppStore } from '@/store'

// Bornes du plafond carte : de 500 ft à FL195 (19500 ft)
const CEIL_MIN = 500
const CEIL_MAX = 19500
// Longueur du curseur (vertical) — grande, mais bornée pour les petits écrans
const SLIDER_LEN = 'min(60vh, 500px)'

function ceilingLabel(ft: number): string {
  if (ft >= 5500) return `FL${Math.round(ft / 100)}`
  return `${ft} ft`
}

// Ombre portée pour rester lisible par-dessus la carte (pas de fond opaque)
const HALO = '0 1px 4px rgba(0,0,0,0.95), 0 0 2px rgba(0,0,0,0.9)'

interface CeilingSliderProps { className?: string }

/**
 * Curseur de plafond carte — toujours visible sur le bord gauche, sans fond.
 * Vertical (slider pivoté à -90°) : 500 ft en bas, FL195 en haut. Seuls le rail
 * et les libellés sont opaques (halo) ; le reste laisse voir et manipuler la carte.
 */
export function CeilingSlider({ className = '' }: CeilingSliderProps) {
  const userCeiling    = useAppStore((s) => s.userCeiling)
  const setUserCeiling = useAppStore((s) => s.setUserCeiling)

  const pct = Math.round(((userCeiling - CEIL_MIN) / (CEIL_MAX - CEIL_MIN)) * 100)

  return (
    <div
      data-testid="ceiling-control"
      className={`absolute left-2 top-1/2 -translate-y-1/2 z-30 flex flex-col items-center gap-2 pointer-events-none select-none ${className}`}
    >
      {/* Valeur courante */}
      <div className="flex flex-col items-center leading-none" style={{ textShadow: HALO }}>
        <span className="font-display font-semibold uppercase tracking-[0.18em]" style={{ fontSize: '9px', color: '#aebfd2' }}>
          Plafond
        </span>
        <span className="font-data font-bold" style={{ fontSize: '15px', color: '#f0a020' }} data-testid="ceiling-value">
          {ceilingLabel(userCeiling)}
        </span>
      </div>

      {/* Repère haut */}
      <span className="font-data" style={{ fontSize: '9px', color: '#cdddf0', textShadow: HALO }}>FL195</span>

      {/* Rail vertical (input horizontal pivoté) */}
      <div
        className="relative flex items-center justify-center pointer-events-auto"
        style={{ height: SLIDER_LEN, width: 38 }}
      >
        <input
          type="range"
          min={CEIL_MIN}
          max={CEIL_MAX}
          step={100}
          value={userCeiling}
          onChange={(e) => setUserCeiling(Number(e.target.value))}
          className="ceiling-range"
          style={{ width: SLIDER_LEN, transform: 'rotate(-90deg)', '--val': pct } as React.CSSProperties}
          aria-label="Plafond utilisateur"
          aria-valuetext={ceilingLabel(userCeiling)}
          data-testid="ceiling-slider"
        />
      </div>

      {/* Repère bas */}
      <span className="font-data" style={{ fontSize: '9px', color: '#cdddf0', textShadow: HALO }}>500 ft</span>
    </div>
  )
}
