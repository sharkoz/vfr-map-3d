import { useAppStore } from '@/store'

// Bornes du plafond carte : du sol (0 ft) à FL195 (19500 ft)
const CEIL_MIN = 0
const CEIL_MAX = 19500

function ceilingLabel(ft: number): string {
  if (ft <= 0) return 'Sol'
  if (ft >= 5500) return `FL${Math.round(ft / 100)}`
  return `${ft} ft`
}

const panelStyle: React.CSSProperties = {
  background:     'rgba(10,16,28,0.92)',
  backdropFilter: 'blur(14px)',
  border:         '1px solid rgba(42,68,100,0.5)',
  borderRadius:   '14px',
  boxShadow:      '0 8px 32px rgba(0,0,0,0.5)',
}

interface CeilingSliderProps { className?: string }

/**
 * Curseur de plafond carte — toujours visible sur le bord gauche de l'écran.
 * Vertical (slider horizontal pivoté à -90°) : le sol est en bas, FL195 en haut.
 */
export function CeilingSlider({ className = '' }: CeilingSliderProps) {
  const userCeiling    = useAppStore((s) => s.userCeiling)
  const setUserCeiling = useAppStore((s) => s.setUserCeiling)

  return (
    <div
      data-testid="ceiling-control"
      className={`absolute left-2 top-1/2 -translate-y-1/2 z-30 flex flex-col items-center gap-1.5 px-2.5 py-3 pointer-events-auto ${className}`}
      style={panelStyle}
    >
      <span
        className="font-display font-semibold uppercase tracking-[0.12em]"
        style={{ fontSize: '9px', color: '#3a5070' }}
      >
        Plafond
      </span>
      <span
        className="font-data font-semibold"
        style={{ fontSize: '12px', color: '#f0a020' }}
        data-testid="ceiling-value"
      >
        {ceilingLabel(userCeiling)}
      </span>

      <span className="font-data" style={{ fontSize: '9px', color: '#2a4060' }}>FL195</span>

      <div
        style={{
          height: 170,
          width: 28,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <input
          type="range"
          min={CEIL_MIN}
          max={CEIL_MAX}
          step={100}
          value={userCeiling}
          onChange={(e) => setUserCeiling(Number(e.target.value))}
          className="slider-amber"
          style={{ width: 170, transform: 'rotate(-90deg)' }}
          aria-label="Plafond utilisateur"
          data-testid="ceiling-slider"
        />
      </div>

      <span className="font-data" style={{ fontSize: '9px', color: '#2a4060' }}>Sol</span>
    </div>
  )
}
