import { useRef } from 'react'
import { useAppStore } from '@/store'

// Bornes du plafond : de 500 ft à FL195 (19500 ft)
const CEIL_MIN = 500
const CEIL_MAX = 19500
const STEP = 100
const AXIS = 16 // position horizontale de l'axe (px depuis le bord gauche)

// Graduations principales (étiquetées) — espacées pour éviter le chevauchement
// des libellés en bas d'échelle (les valeurs intermédiaires restent en mineures)
const MAJOR_TICKS = [500, 1500, 3000, 5000, 7500, 10000, 15000, 19500]
const MINOR_TICKS: number[] = []
for (let v = CEIL_MIN; v <= CEIL_MAX; v += 500) {
  if (!MAJOR_TICKS.includes(v)) MINOR_TICKS.push(v)
}

// Libellé compact des graduations (pieds, puis niveaux de vol)
function tickLabel(ft: number): string {
  return ft >= 5500 ? `FL${Math.round(ft / 100)}` : `${ft}`
}
// Libellé complet de la valeur courante (avec unité)
function valueLabel(ft: number): string {
  return ft >= 5500 ? `FL${Math.round(ft / 100)}` : `${ft} ft`
}
// Position verticale (0 % en bas = 500 ft, 100 % en haut = FL195)
function pct(ft: number): number {
  return ((ft - CEIL_MIN) / (CEIL_MAX - CEIL_MIN)) * 100
}

const HALO = '0 1px 3px rgba(0,0,0,0.95), 0 0 2px rgba(0,0,0,0.9)'

interface CeilingSliderProps { className?: string }

/**
 * Curseur de plafond carte — échelle altimétrique verticale sur le bord gauche,
 * sans fond (laisse voir la carte), occupant presque toute la hauteur.
 * Graduations + libellés FL, bug ambré déplaçable. Un input range masqué assure
 * l'accessibilité clavier et les tests.
 */
export function CeilingSlider({ className = '' }: CeilingSliderProps) {
  const userCeiling    = useAppStore((s) => s.userCeiling)
  const setUserCeiling = useAppStore((s) => s.setUserCeiling)
  const trackRef = useRef<HTMLDivElement>(null)

  const setFromClientY = (clientY: number) => {
    const el = trackRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const ratio = 1 - (clientY - r.top) / r.height // 1 en haut, 0 en bas
    const raw = CEIL_MIN + ratio * (CEIL_MAX - CEIL_MIN)
    const snapped = Math.min(CEIL_MAX, Math.max(CEIL_MIN, Math.round(raw / STEP) * STEP))
    setUserCeiling(snapped)
  }

  const handleDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    setFromClientY(e.clientY)
  }
  const handleMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.buttons === 0) return // glisser uniquement bouton/touch enfoncé
    setFromClientY(e.clientY)
  }

  const valPct = pct(userCeiling)

  return (
    <div
      data-testid="ceiling-control"
      className={`absolute left-0 top-16 bottom-4 z-30 pointer-events-none select-none ${className}`}
      style={{ width: 92 }}
    >
      <div
        ref={trackRef}
        onPointerDown={handleDown}
        onPointerMove={handleMove}
        className="absolute inset-0 pointer-events-auto"
        style={{ touchAction: 'none', cursor: 'ns-resize' }}
      >
        {/* Axe vertical (rail) */}
        <div style={{ position: 'absolute', left: AXIS, marginLeft: -1, top: 0, bottom: 0, width: 2, background: 'rgba(180,200,224,0.35)', borderRadius: 1 }} />
        {/* Bande ambrée : du sol jusqu'au plafond courant */}
        <div style={{ position: 'absolute', left: AXIS, marginLeft: -1.5, width: 3, bottom: 0, height: `${valPct}%`, background: 'rgba(240,160,32,0.5)', borderRadius: 2 }} />

        {/* Graduations secondaires (tous les 500 ft) */}
        {MINOR_TICKS.map((v) => (
          <div key={v} style={{ position: 'absolute', left: 0, right: 0, height: 0, bottom: `${pct(v)}%` }}>
            <div style={{ position: 'absolute', left: AXIS + 3, bottom: 0, transform: 'translateY(50%)', width: 6, height: 1, background: 'rgba(180,200,224,0.4)' }} />
          </div>
        ))}

        {/* Graduations principales + libellés */}
        {MAJOR_TICKS.map((v) => (
          <div key={v} style={{ position: 'absolute', left: 0, right: 0, height: 0, bottom: `${pct(v)}%` }}>
            <div style={{ position: 'absolute', left: AXIS + 3, bottom: 0, transform: 'translateY(50%)', width: 12, height: 1.5, background: 'rgba(205,221,240,0.9)' }} />
            <span style={{ position: 'absolute', left: AXIS + 19, bottom: 0, transform: 'translateY(50%)', fontFamily: 'var(--font-data)', fontSize: '10px', lineHeight: 1, color: '#cdddf0', textShadow: HALO, whiteSpace: 'nowrap' }}>
              {tickLabel(v)}
            </span>
          </div>
        ))}

        {/* Bug de plafond (curseur déplaçable) */}
        <div style={{ position: 'absolute', left: 0, right: 0, height: 0, bottom: `${valPct}%`, zIndex: 2 }}>
          {/* trait pointeur */}
          <div style={{ position: 'absolute', left: 0, bottom: 0, transform: 'translateY(50%)', width: AXIS + 9, height: 2, background: '#f0a020', boxShadow: '0 0 8px rgba(240,160,32,0.85)', borderRadius: 1 }} />
          {/* pastille sur l'axe */}
          <div style={{ position: 'absolute', left: 0, marginLeft: AXIS - 5, bottom: 0, transform: 'translateY(50%)', width: 10, height: 10, borderRadius: '50%', background: '#f0a020', border: '2px solid #0a1018', boxShadow: '0 0 10px rgba(240,160,32,0.9)' }} />
          {/* pastille de valeur */}
          <div style={{ position: 'absolute', left: AXIS + 15, bottom: 0, transform: 'translateY(50%)', padding: '2px 7px', borderRadius: 6, background: 'rgba(16,24,40,0.55)', border: '1px solid rgba(240,160,32,0.6)', boxShadow: '0 1px 6px rgba(0,0,0,0.6)', whiteSpace: 'nowrap' }}>
            <span data-testid="ceiling-value" style={{ fontFamily: 'var(--font-data)', fontSize: '12px', fontWeight: 700, color: '#f7c66a', textShadow: HALO, lineHeight: 1 }}>
              {valueLabel(userCeiling)}
            </span>
          </div>
        </div>
      </div>

      {/* Input accessible (clavier + lecteurs d'écran + tests), masqué visuellement */}
      <input
        type="range"
        min={CEIL_MIN}
        max={CEIL_MAX}
        step={STEP}
        value={userCeiling}
        onChange={(e) => setUserCeiling(Number(e.target.value))}
        className="sr-only"
        data-testid="ceiling-slider"
        aria-label="Plafond utilisateur"
        aria-valuetext={valueLabel(userCeiling)}
      />
    </div>
  )
}
