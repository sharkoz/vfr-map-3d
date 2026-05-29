import { useEffect, useRef } from 'react'
import { useAppStore } from '@/store'
import type { AirportFeature } from '@/types/airport'
import {
  AIRPORT_TYPE_ICONS,
  AIRPORT_TYPE_LABELS,
  AIRPORT_COLORS,
  FREQUENCY_TYPE_LABELS,
} from '@/types/airport'

interface AirportPanelProps {
  airport: AirportFeature | null
}

const SURFACE_LABELS: Record<string, string> = {
  ASPHALT:  'Asphalte',
  CONCRETE: 'Béton',
  GRASS:    'Herbe',
  GRAVEL:   'Gravier',
  WATER:    'Eau',
  OTHER:    'Autre',
}

const SURFACE_COLORS: Record<string, string> = {
  ASPHALT:  '#374151',
  CONCRETE: '#4b5563',
  GRASS:    '#166534',
  GRAVEL:   '#78350f',
  WATER:    '#0c4a6e',
}

const panelStyle: React.CSSProperties = {
  background:    'rgba(10,16,28,0.98)',
  backdropFilter: 'blur(16px)',
  borderTop:     '1px solid rgba(42,68,100,0.5)',
}

export function AirportPanel({ airport }: AirportPanelProps) {
  const setSelectedAirport = useAppStore((s) => s.setSelectedAirport)
  const zoneStackOpen      = useAppStore((s) => !!s.zoneStack?.length)
  const panelRef = useRef<HTMLDivElement>(null)

  const isOpen = airport !== null

  // Swipe down to close
  useEffect(() => {
    if (!panelRef.current || !isOpen) return
    const el = panelRef.current
    let startY = 0
    const onTouchStart = (e: TouchEvent) => { startY = e.touches[0].clientY }
    const onTouchEnd   = (e: TouchEvent) => {
      if (e.changedTouches[0].clientY - startY > 80) setSelectedAirport(null)
    }
    el.addEventListener('touchstart', onTouchStart)
    el.addEventListener('touchend',   onTouchEnd)
    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchend',   onTouchEnd)
    }
  }, [isOpen, setSelectedAirport])

  if (!airport) return null

  const { name, type, icaoCode, iataCode, elevation, frequencies: rawFrequencies, runways: rawRunways } = airport.properties

  const frequencies = typeof rawFrequencies === 'string' ? JSON.parse(rawFrequencies) as typeof rawFrequencies : rawFrequencies
  const runways     = typeof rawRunways     === 'string' ? JSON.parse(rawRunways)     as typeof rawRunways     : rawRunways

  const typeIcon  = AIRPORT_TYPE_ICONS[type]  ?? '📍'
  const typeLabel = AIRPORT_TYPE_LABELS[type] ?? 'Aérodrome'
  const color     = AIRPORT_COLORS[type]      ?? '#6b7280'

  const sortedFreqs = [...frequencies].sort((a, b) => a.type - b.type)

  const isPrivate = type === 'PRIVATE'
  const ppr       = airport.properties.ppr

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        onClick={() => setSelectedAirport(null)}
        data-testid="airport-panel-overlay"
        aria-hidden="true"
      />

      {/* Slide-up panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-label={`Informations ${name}`}
        data-testid="airport-panel"
        className={`
          fixed bottom-0 left-0 z-50
          rounded-t-2xl shadow-2xl
          max-h-[60vh] overflow-y-auto scrollbar-dark
          transition-all duration-300 ease-out
          ${zoneStackOpen ? 'right-80' : 'right-0'}
          ${isOpen ? 'translate-y-0' : 'translate-y-full'}
        `}
        style={panelStyle}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(42,68,100,0.6)' }} />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between px-4 py-3">
          <div className="flex items-start gap-3">
            <div
              className="rounded-xl p-2 shrink-0 mt-0.5"
              style={{ background: `${color}18`, border: `1px solid ${color}30` }}
            >
              <span className="text-xl" role="img" aria-label={typeLabel}>{typeIcon}</span>
            </div>
            <div>
              <h2
                className="font-display font-bold text-lg leading-tight tracking-wide"
                style={{ color: '#c8d8e8' }}
              >
                {name}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                {icaoCode && (
                  <span
                    className="font-data font-bold px-2 py-0.5 rounded text-xs"
                    style={{ background: `${color}20`, color, border: `1px solid ${color}40` }}
                  >
                    {icaoCode}
                  </span>
                )}
                {iataCode && (
                  <span className="font-data text-xs" style={{ color: '#3a5070' }}>{iataCode}</span>
                )}
              </div>
              <p className="font-display text-sm mt-0.5 tracking-wide" style={{ color: '#3a5070' }}>{typeLabel}</p>
            </div>
          </div>

          <button
            onClick={() => setSelectedAirport(null)}
            className="p-1.5 rounded-lg transition-colors ml-2 shrink-0"
            style={{ color: '#3a5070' }}
            aria-label="Fermer"
            onMouseEnter={e => (e.currentTarget.style.color = '#c8d8e8')}
            onMouseLeave={e => (e.currentTarget.style.color = '#3a5070')}
          >
            ✕
          </button>
        </div>

        {/* Private badge */}
        {isPrivate && (
          <div
            data-testid="airport-private-badge"
            className="mx-4 mb-3 p-3 rounded-xl"
            style={{
              background: 'rgba(240,160,32,0.08)',
              border: '1px solid rgba(240,160,32,0.2)',
            }}
          >
            <p className="font-display text-xs tracking-wide" style={{ color: '#c0883a' }}>
              🔒 Terrain <strong>privé</strong>
              {ppr ? ' — PPR obligatoire (Prior Permission Required)' : ' — accord préalable recommandé'}
            </p>
          </div>
        )}

        {/* Elevation */}
        <div
          className="mx-4 mb-3 p-3 rounded-xl flex items-center gap-2.5"
          style={{ background: 'rgba(7,12,20,0.6)', border: '1px solid rgba(42,68,100,0.3)' }}
        >
          <span className="text-sm" aria-hidden>⛰️</span>
          <div>
            <span className="font-display text-xs uppercase tracking-wider" style={{ color: '#3a5070' }}>Élévation</span>
            <span className="font-data font-medium ml-2" style={{ fontSize: '13px', color: '#8aaccc' }}>
              {elevation} <span style={{ color: '#3a5070' }}>ft AMSL</span>
            </span>
          </div>
        </div>

        {/* Frequencies */}
        {sortedFreqs.length > 0 && (
          <div className="px-4 mb-3">
            <h3
              className="font-display text-xs font-semibold uppercase tracking-[0.15em] mb-2"
              style={{ color: '#3a5070' }}
            >
              Fréquences
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {sortedFreqs.map((freq, i) => (
                <FreqCard
                  key={i}
                  label={FREQUENCY_TYPE_LABELS[freq.type] ?? 'Radio'}
                  value={`${freq.value} MHz`}
                />
              ))}
            </div>
          </div>
        )}

        {/* Runways */}
        {runways.length > 0 && (
          <div className="px-4 pb-6">
            <h3
              className="font-display text-xs font-semibold uppercase tracking-[0.15em] mb-2"
              style={{ color: '#3a5070' }}
            >
              Pistes
            </h3>
            <div className="space-y-2">
              {runways.map((rwy, i) => {
                const surfColor = SURFACE_COLORS[rwy.surface] ?? '#374151'
                return (
                  <div
                    key={i}
                    className="flex items-center justify-between px-3 py-2.5 rounded-xl"
                    style={{ background: 'rgba(7,12,20,0.6)', border: '1px solid rgba(42,68,100,0.3)' }}
                  >
                    <div className="flex items-center gap-2">
                      {rwy.designator ? (
                        <span className="font-data font-bold" style={{ fontSize: '12px', color: '#8aaccc' }}>
                          RWY {rwy.designator}
                        </span>
                      ) : (
                        <span className="font-data font-bold" style={{ fontSize: '12px', color: '#8aaccc' }}>
                          {String(Math.round(rwy.trueHdg / 10)).padStart(2, '0')}
                        </span>
                      )}
                      {rwy.trueHdg > 0 && (
                        <span className="font-data" style={{ fontSize: '10px', color: '#2a4060' }}>{rwy.trueHdg}°</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {rwy.length > 0 && (
                        <span className="font-data font-medium" style={{ fontSize: '11px', color: '#7a9ab8' }}>
                          {rwy.length} m
                        </span>
                      )}
                      <span
                        className="font-display font-semibold text-xs px-2 py-0.5 rounded-md"
                        style={{ background: `${surfColor}30`, color: surfColor === '#166534' ? '#4ade80' : '#8aaccc', border: `1px solid ${surfColor}50` }}
                      >
                        {SURFACE_LABELS[rwy.surface] ?? rwy.surface}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Empty state */}
        {runways.length === 0 && sortedFreqs.length === 0 && (
          <div className="px-4 pb-6">
            <p className="font-display text-sm italic" style={{ color: '#2a4060' }}>
              Aucune information disponible
            </p>
          </div>
        )}
      </div>
    </>
  )
}

function FreqCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-xl p-3"
      style={{ background: 'rgba(7,12,20,0.6)', border: '1px solid rgba(42,68,100,0.3)' }}
    >
      <p className="font-display text-[10px] uppercase tracking-wider mb-1" style={{ color: '#2a4060' }}>{label}</p>
      <p className="font-data font-semibold" style={{ fontSize: '12px', color: '#20b8d8' }}>{value}</p>
    </div>
  )
}
