import { useAppStore } from '@/store'
import type { AirspaceFilters } from '@/types/airspace'

const LAYER_GROUPS = [
  { key: 'showClassG'     as keyof AirspaceFilters, label: 'Classe G', emoji: '🟢', description: 'Espace libre'  },
  { key: 'showClassE'     as keyof AirspaceFilters, label: 'Classe E', emoji: '🟡', description: 'VFR libre'     },
  { key: 'showCTR'        as keyof AirspaceFilters, label: 'CTR',      emoji: '🟠', description: 'Contrôlé'      },
  { key: 'showTMA'        as keyof AirspaceFilters, label: 'TMA',      emoji: '🟠', description: 'Terminal'      },
  { key: 'showProhibited' as keyof AirspaceFilters, label: 'Zone P',   emoji: '🔴', description: 'Interdit'      },
  { key: 'showRestricted' as keyof AirspaceFilters, label: 'Zone R',   emoji: '🔴', description: 'Restreint'     },
  { key: 'showDanger'     as keyof AirspaceFilters, label: 'Zone D',   emoji: '🟣', description: 'Dangereux'     },
  { key: 'showSIV'        as keyof AirspaceFilters, label: 'SIV',      emoji: '🔵', description: 'Info vol'      },
] as const

function ceilingLabel(ft: number): string {
  if (ft <= 0) return 'Sol'
  if (ft >= 5500) return `FL${Math.round(ft / 100)}`
  return `${ft} ft`
}

const panelStyle: React.CSSProperties = {
  background:    'rgba(10,16,28,0.97)',
  backdropFilter: 'blur(14px)',
  border:        '1px solid rgba(42,68,100,0.5)',
  borderRadius:  '14px',
  boxShadow:     '0 8px 32px rgba(0,0,0,0.5)',
}

const btnActive: React.CSSProperties = {
  background: 'rgba(240,160,32,0.12)',
  border:     '1px solid rgba(240,160,32,0.3)',
  color:      '#f0a020',
}

const btnInactive: React.CSSProperties = {
  background: 'rgba(30,48,80,0.35)',
  border:     '1px solid rgba(42,68,100,0.35)',
  color:      '#2a4060',
  textDecoration: 'line-through',
}

interface LayerControlProps { className?: string }

export function LayerControl({ className = '' }: LayerControlProps) {
  const filters               = useAppStore((s) => s.filters)
  const setFilter             = useAppStore((s) => s.setFilter)
  const resetFilters          = useAppStore((s) => s.resetFilters)
  const showAirports          = useAppStore((s) => s.showAirports)
  const toggleAirports        = useAppStore((s) => s.toggleAirports)
  const showPrivateAirports   = useAppStore((s) => s.showPrivateAirports)
  const togglePrivateAirports = useAppStore((s) => s.togglePrivateAirports)
  const userCeiling           = useAppStore((s) => s.userCeiling)
  const setUserCeiling        = useAppStore((s) => s.setUserCeiling)

  const pct = Math.round(((userCeiling - 500) / (19500 - 500)) * 100)

  return (
    <div
      data-testid="layer-control"
      className={`p-3 ${className}`}
      style={panelStyle}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2.5">
        <span className="font-display font-semibold text-xs uppercase tracking-[0.15em]" style={{ color: '#3a5070' }}>
          Couches
        </span>
        <button
          onClick={resetFilters}
          className="font-display text-xs transition-colors"
          style={{ color: '#3a7090' }}
          aria-label="Réinitialiser les filtres"
          onMouseEnter={e => (e.currentTarget.style.color = '#f0a020')}
          onMouseLeave={e => (e.currentTarget.style.color = '#3a7090')}
        >
          Tout afficher
        </button>
      </div>

      {/* Airspace type toggles */}
      <div className="flex flex-wrap gap-1.5 mb-2.5">
        {LAYER_GROUPS.map(({ key, label, emoji }) => {
          const isActive = Boolean(filters[key])
          return (
            <button
              key={key}
              onClick={() => setFilter(key, !isActive)}
              aria-pressed={isActive}
              aria-label={`${isActive ? 'Masquer' : 'Afficher'} ${label}`}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-display text-xs font-medium transition-all duration-150"
              style={isActive ? btnActive : btnInactive}
            >
              <span>{emoji}</span>
              <span>{label}</span>
            </button>
          )
        })}
      </div>

      {/* Airport toggles */}
      <div
        className="pt-2 flex flex-wrap gap-1.5"
        style={{ borderTop: '1px solid rgba(42,68,100,0.3)' }}
      >
        <button
          onClick={toggleAirports}
          aria-pressed={showAirports}
          aria-label={`${showAirports ? 'Masquer' : 'Afficher'} les aérodromes`}
          data-testid="airports-toggle"
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-display text-xs font-medium transition-all duration-150"
          style={showAirports
            ? { background: 'rgba(32,184,216,0.12)', border: '1px solid rgba(32,184,216,0.3)', color: '#20b8d8' }
            : btnInactive
          }
        >
          <span>🛬</span>
          <span>Aérodromes</span>
        </button>

        <button
          onClick={togglePrivateAirports}
          aria-pressed={showPrivateAirports}
          aria-label={`${showPrivateAirports ? 'Masquer' : 'Afficher'} les terrains privés`}
          data-testid="private-airports-toggle"
          title="Terrains privés (PPR, clubs, fermes)"
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-display text-xs font-medium transition-all duration-150"
          style={showPrivateAirports
            ? { background: 'rgba(240,160,32,0.12)', border: '1px solid rgba(240,160,32,0.3)', color: '#f0a020' }
            : btnInactive
          }
        >
          <span>🔒</span>
          <span>Privés</span>
        </button>
      </div>

      {/* Ceiling control */}
      <div
        className="pt-2.5 mt-0.5"
        data-testid="ceiling-control"
        style={{ borderTop: '1px solid rgba(42,68,100,0.3)' }}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="font-display font-semibold text-xs uppercase tracking-[0.12em]" style={{ color: '#3a5070' }}>
            Plafond carte
          </span>
          <span
            className="font-data font-semibold"
            style={{ fontSize: '12px', color: '#f0a020' }}
            data-testid="ceiling-value"
          >
            {ceilingLabel(userCeiling)}
          </span>
        </div>

        <input
          type="range"
          min={500}
          max={19500}
          step={500}
          value={userCeiling}
          onChange={(e) => setUserCeiling(Number(e.target.value))}
          className="slider-amber"
          style={{ '--val': pct } as React.CSSProperties}
          aria-label="Plafond utilisateur"
          data-testid="ceiling-slider"
        />

        <div className="flex justify-between mt-1">
          <span className="font-data" style={{ fontSize: '9px', color: '#2a4060' }}>500 ft</span>
          <span className="font-data" style={{ fontSize: '9px', color: '#2a4060' }}>FL195</span>
        </div>
      </div>
    </div>
  )
}
