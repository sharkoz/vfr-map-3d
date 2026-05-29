import { useEffect } from 'react'
import { useAppStore } from '@/store'
import { formatAltitude, getZoneDescription } from '@/utils/zoneDescription'
import type { AirspaceFeature, AltitudeLimit } from '@/types/airspace'

// ── Altitude utilities ──────────────────────────────────────────────────────

/** Converts any AltitudeLimit to feet (FL × 100) for sorting / chart */
export function toFeet(limit: AltitudeLimit): number {
  const unitStr = String(limit.unit)
  const isFL = unitStr === 'FL' || unitStr === '6'
  return isFL ? limit.value * 100 : limit.value
}

/** Human-readable altitude label used on the chart Y-axis */
export function feetLabel(ft: number): string {
  if (ft <= 0) return 'Sol'
  if (ft >= 5500) return `FL${Math.round(ft / 100)}`
  return `${ft} ft`
}

/** Returns 4–6 nice round tick values for a Y-axis up to maxFt */
export function getAltTicks(maxFt: number): number[] {
  const step =
    maxFt <= 2000  ? 500  :
    maxFt <= 6000  ? 1000 :
    maxFt <= 12000 ? 2000 :
    5000
  const ticks: number[] = []
  for (let t = 0; t <= maxFt; t += step) ticks.push(t)
  return ticks
}

// ── Zone color palette (dark-theme) ────────────────────────────────────────

const COLORS = {
  green:  { bar: 'bg-green-500',  pill: 'bg-green-900/30 text-green-400',   hex: '#22c55e' },
  yellow: { bar: 'bg-yellow-400', pill: 'bg-yellow-900/30 text-yellow-400', hex: '#facc15' },
  orange: { bar: 'bg-orange-500', pill: 'bg-orange-900/30 text-orange-400', hex: '#f97316' },
  red:    { bar: 'bg-red-500',    pill: 'bg-red-900/30 text-red-400',       hex: '#ef4444' },
  purple: { bar: 'bg-purple-500', pill: 'bg-purple-900/30 text-purple-400', hex: '#a855f7' },
  blue:   { bar: 'bg-blue-400',   pill: 'bg-blue-900/30 text-sky-400',      hex: '#60a5fa' },
} as const

type ColorSet = (typeof COLORS)[keyof typeof COLORS]

// ── AltitudeChart ───────────────────────────────────────────────────────────

const CHART_H = 140 // px

function AltitudeChart({
  zones,
  ceiling,
  zoneColors,
  highlightedZoneId,
  onHighlight,
}: {
  zones: AirspaceFeature[]
  ceiling: number
  zoneColors: ColorSet[]
  highlightedZoneId: string | null
  onHighlight: (id: string | null) => void
}) {
  const ticks = getAltTicks(ceiling)

  return (
    <div
      className="px-3 py-2 shrink-0"
      data-testid="altitude-chart"
      style={{ borderBottom: '1px solid rgba(42,68,100,0.4)', background: 'rgba(7,12,20,0.5)' }}
    >
      <p className="font-display text-[9px] font-semibold uppercase tracking-[0.18em] mb-1.5" style={{ color: '#3a5070' }}>
        Vue altitude
      </p>

      <div className="flex gap-1" style={{ height: CHART_H }}>
        {/* Y-axis ruler */}
        <div className="relative shrink-0" style={{ width: 38 }}>
          {ticks.map((t) => (
            <div
              key={t}
              className="absolute right-0 flex items-center justify-end gap-0.5"
              style={{ bottom: `${(t / ceiling) * 100}%`, transform: 'translateY(50%)' }}
            >
              <span className="font-data leading-none whitespace-nowrap" style={{ fontSize: '7px', color: '#3a5070' }}>
                {feetLabel(t)}
              </span>
              <div style={{ width: 5, height: 1, background: '#2a4060' }} />
            </div>
          ))}
        </div>

        {/* Chart area */}
        <div
          className="relative flex-1 overflow-hidden"
          style={{
            borderLeft: '1px solid rgba(42,68,100,0.5)',
            borderBottom: '1px solid rgba(42,68,100,0.5)',
            background:
              'repeating-linear-gradient(0deg, transparent, transparent 19px, rgba(42,68,100,0.12) 20px)',
          }}
        >
          {/* Grid lines */}
          {ticks.map((t) => (
            <div
              key={t}
              className="absolute left-0 right-0"
              style={{ bottom: `${(t / ceiling) * 100}%`, borderTop: '1px solid rgba(42,64,96,0.2)' }}
            />
          ))}

          {/* One column per zone */}
          <div className="absolute inset-0 flex gap-0.5 px-0.5">
            {zones.map((zone, i) => {
              const lo   = Math.max(0, toFeet(zone.properties.lowerLimit))
              const hi   = Math.min(ceiling, toFeet(zone.properties.upperLimit))
              const bPct = (lo / ceiling) * 100
              const hPct = Math.max(2, ((hi - lo) / ceiling) * 100)
              const color = zoneColors[i]
              const zoneId      = zone.properties.id ?? null
              const isHighlight = zoneId !== null && zoneId === highlightedZoneId
              return (
                <div
                  key={zoneId ?? i}
                  className="relative flex-1 min-w-0 cursor-pointer"
                  data-testid={`chart-bar-${i + 1}`}
                  onClick={() => onHighlight(isHighlight ? null : zoneId)}
                  title={zone.properties.name}
                >
                  {/* Bar */}
                  <div
                    className="absolute inset-x-0 rounded-sm transition-all duration-200 chart-bar-animated"
                    style={{
                      bottom: `${bPct}%`,
                      height: `${hPct}%`,
                      backgroundColor: color?.hex ?? '#94a3b8',
                      opacity: isHighlight ? 1 : 0.6,
                      boxShadow: isHighlight ? `0 0 10px ${color?.hex ?? '#94a3b8'}70` : 'none',
                      outline: isHighlight ? `1px solid ${color?.hex ?? '#94a3b8'}` : 'none',
                    }}
                  />
                  {/* Index label */}
                  <span
                    className="absolute inset-x-0 text-center pointer-events-none font-data"
                    style={{
                      bottom: `${Math.max(0, bPct - 12)}%`,
                      fontSize: '8px',
                      color: isHighlight ? (color?.hex ?? '#7a9ab8') : '#2a4060',
                      fontWeight: isHighlight ? 600 : 400,
                    }}
                  >
                    {i + 1}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── ZoneStack ───────────────────────────────────────────────────────────────

export function ZoneStack() {
  const zoneStack            = useAppStore((s) => s.zoneStack)
  const setZoneStack         = useAppStore((s) => s.setZoneStack)
  const userCeiling          = useAppStore((s) => s.userCeiling)
  const highlightedZoneId    = useAppStore((s) => s.highlightedZoneId)
  const setHighlightedZoneId = useAppStore((s) => s.setHighlightedZoneId)

  const handleClose = () => {
    setZoneStack(null)
    setHighlightedZoneId(null)
  }

  const handleHighlight = (id: string | null) => setHighlightedZoneId(id)

  // Close on Escape
  useEffect(() => {
    if (!zoneStack?.length) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoneStack])

  if (!zoneStack || zoneStack.length === 0) return null

  // Sort by floor ascending
  const sorted = [...zoneStack].sort(
    (a, b) => toFeet(a.properties.lowerLimit) - toFeet(b.properties.lowerLimit),
  )

  const visible     = sorted.filter((z) => toFeet(z.properties.lowerLimit) < userCeiling)
  const hiddenCount = sorted.length - visible.length

  const zoneColors: ColorSet[] = visible.map((zone) => {
    const desc = getZoneDescription(zone.properties.type, zone.properties.class)
    return COLORS[desc.color]
  })

  return (
    <div
      role="complementary"
      aria-label="Espaces aériens à cette position"
      data-testid="zone-stack-panel"
      className="fixed right-0 top-14 bottom-0 z-40 w-80 max-w-[85vw] flex flex-col"
      style={{
        background: 'rgba(10,16,28,0.97)',
        backdropFilter: 'blur(14px)',
        borderLeft: '1px solid rgba(42,68,100,0.45)',
        boxShadow: '-4px 0 32px rgba(0,0,0,0.5)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ borderBottom: '1px solid rgba(42,68,100,0.4)', background: 'rgba(7,12,20,0.6)' }}
      >
        <div>
          <h2 className="font-display font-bold text-sm tracking-widest uppercase" style={{ color: '#c8d8e8' }}>
            Espaces aériens
          </h2>
          <p className="font-display text-xs mt-0.5" style={{ color: '#3a5070' }}>
            {visible.length} couche{visible.length > 1 ? 's' : ''} à cette position
          </p>
        </div>
        <button
          onClick={handleClose}
          aria-label="Fermer"
          className="p-1.5 rounded-lg transition-colors"
          style={{ color: '#3a5070' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#c8d8e8')}
          onMouseLeave={e => (e.currentTarget.style.color = '#3a5070')}
        >
          ✕
        </button>
      </div>

      {/* Altitude chart */}
      {visible.length > 0 && (
        <AltitudeChart
          zones={visible}
          ceiling={userCeiling}
          zoneColors={zoneColors}
          highlightedZoneId={highlightedZoneId}
          onHighlight={handleHighlight}
        />
      )}

      {/* Hidden zones notice */}
      {hiddenCount > 0 && (
        <p
          className="px-4 py-1.5 font-display text-xs shrink-0 tracking-wide"
          data-testid="hidden-zones-notice"
          style={{
            color: '#f0a020',
            background: 'rgba(240,160,32,0.06)',
            borderBottom: '1px solid rgba(240,160,32,0.15)',
          }}
        >
          +{hiddenCount} zone{hiddenCount > 1 ? 's' : ''} au-dessus du plafond
        </p>
      )}

      {/* Zone list */}
      <div className="flex-1 overflow-y-auto scrollbar-dark" data-testid="zone-stack-list">
        {visible.map((zone, i) => (
          <ZoneItem
            key={`${zone.properties.id ?? zone.properties.name}-${i}`}
            zone={zone}
            index={i + 1}
            colors={zoneColors[i]}
            highlighted={zone.properties.id !== undefined && zone.properties.id === highlightedZoneId}
            onHighlight={() =>
              handleHighlight(
                zone.properties.id === highlightedZoneId ? null : (zone.properties.id ?? null),
              )
            }
          />
        ))}
      </div>
    </div>
  )
}

// ── ZoneItem ────────────────────────────────────────────────────────────────

function ZoneItem({
  zone,
  index,
  colors,
  highlighted = false,
  onHighlight,
}: {
  zone: AirspaceFeature
  index: number
  colors: ColorSet
  highlighted?: boolean
  onHighlight?: () => void
}) {
  const { name, type, class: cls, lowerLimit, upperLimit, frequency, callsign } = zone.properties
  const desc = getZoneDescription(type, cls)

  return (
    <div
      data-testid="zone-stack-item"
      role="button"
      tabIndex={0}
      aria-pressed={highlighted}
      onClick={onHighlight}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onHighlight?.() }}
      className="flex items-stretch transition-all duration-150 cursor-pointer select-none"
      style={{
        borderBottom: '1px solid rgba(30,48,80,0.6)',
        background: highlighted
          ? `rgba(${hexToRgb(colors.hex)},0.07)`
          : 'transparent',
        boxShadow: highlighted
          ? `inset 2px 0 0 ${colors.hex}`
          : 'none',
      }}
      onMouseEnter={e => {
        if (!highlighted) e.currentTarget.style.background = 'rgba(30,48,80,0.4)'
      }}
      onMouseLeave={e => {
        if (!highlighted) e.currentTarget.style.background = 'transparent'
      }}
    >
      {/* Colored accent strip */}
      <div
        className="w-1 shrink-0"
        style={{ background: highlighted ? colors.hex : `${colors.hex}55` }}
      />

      {/* Index badge */}
      <div
        className="w-6 shrink-0 flex items-center justify-center"
        style={{ background: 'rgba(7,12,20,0.4)' }}
      >
        <span
          className="font-data"
          style={{
            fontSize: '9px',
            fontWeight: 600,
            color: highlighted ? colors.hex : '#2a4060',
          }}
        >
          {index}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 px-3 py-2.5 min-w-0">

        {/* Name + class badge */}
        <div className="flex items-start gap-1.5 mb-0.5">
          <span className="text-sm leading-none mt-0.5 shrink-0" aria-hidden>{desc.icon}</span>
          <p
            className="font-display font-semibold text-sm leading-tight flex-1 break-words tracking-wide"
            style={{ color: '#c0d0e0' }}
          >
            {name}
          </p>
          {cls && (
            <span
              className="shrink-0 font-data px-1.5 py-0.5 rounded"
              style={{
                fontSize: '9px',
                fontWeight: 700,
                background: 'rgba(42,68,100,0.4)',
                border: '1px solid rgba(42,68,100,0.5)',
                color: '#5a7a9a',
              }}
            >
              {cls}
            </span>
          )}
        </div>

        {/* Type description */}
        <p
          className="font-display text-[10px] mb-2 tracking-wide uppercase"
          style={{ color: '#3a5070' }}
        >
          {desc.title}
        </p>

        {/* Altitude block */}
        <div
          className="rounded-md px-2.5 py-1.5 mb-2"
          style={{
            background: 'rgba(7,12,20,0.6)',
            border: '1px solid rgba(42,68,100,0.3)',
          }}
        >
          <div className="flex items-center justify-between gap-1">
            <span className="font-display text-[8px] uppercase tracking-widest shrink-0" style={{ color: '#2a4060' }}>
              Plancher
            </span>
            <span className="font-data" style={{ fontSize: '11px', color: '#8aaccc' }}>
              {formatAltitude(lowerLimit)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-1 mt-0.5">
            <span className="font-display text-[8px] uppercase tracking-widest shrink-0" style={{ color: '#2a4060' }}>
              Plafond
            </span>
            <span className="font-data font-medium" style={{ fontSize: '11px', color: '#f0a020' }}>
              {formatAltitude(upperLimit)}
            </span>
          </div>
        </div>

        {/* Radio frequency */}
        {frequency && (
          <p className="font-data mb-2" style={{ fontSize: '11px', color: '#30b8d8' }}>
            <span style={{ color: '#3a5070' }}>📡 </span>
            {frequency}
            <span style={{ color: '#2a4060' }}> MHz</span>
            {callsign && (
              <span style={{ color: '#20a8c8' }}>
                {' · '}{callsign}
              </span>
            )}
          </p>
        )}

        {/* ULM rule pill */}
        <span
          className={`inline-block font-display text-[10px] font-semibold px-2 py-0.5 rounded-full ${colors.pill}`}
        >
          {desc.rule}
        </span>
      </div>
    </div>
  )
}

// ── Helper ──────────────────────────────────────────────────────────────────

/** Convert #rrggbb to "r,g,b" for rgba() usage */
function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r},${g},${b}`
}
