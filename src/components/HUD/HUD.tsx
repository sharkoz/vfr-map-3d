import { useAppStore } from '@/store'
import { formatLatLon, formatHeading, msToKnots } from '@/utils/geoFormat'

interface HUDProps { className?: string }

/**
 * HUD compact (mesures & outils) affiché en bas au centre de la carte :
 * - coordonnées du centre de la carte (toujours)
 * - cap et vitesse sol issus du GPS (si disponibles, càd en mouvement)
 */
export function HUD({ className = '' }: HUDProps) {
  const mapCenter  = useAppStore((s) => s.mapCenter)
  const gpsSpeed   = useAppStore((s) => s.gpsSpeed)
  const gpsHeading = useAppStore((s) => s.gpsHeading)

  const knots   = msToKnots(gpsSpeed)
  const heading = formatHeading(gpsHeading)
  const hasMotion = knots != null || heading != null

  if (!mapCenter && !hasMotion) return null

  return (
    <div
      data-testid="hud"
      className={`flex items-center gap-3 px-3 py-1.5 rounded-xl font-data ${className}`}
      style={{
        background: 'rgba(10,16,28,0.92)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(42,68,100,0.5)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
      }}
    >
      {mapCenter && (
        <span
          data-testid="hud-coords"
          className="text-[11px] tracking-wide tabular-nums"
          style={{ color: '#5a7a9a' }}
          title="Coordonnées du centre de la carte"
        >
          {formatLatLon(mapCenter[0], mapCenter[1])}
        </span>
      )}

      {heading != null && (
        <span className="flex items-center gap-1" data-testid="hud-heading" title="Cap sol (GPS)">
          <span className="text-[9px] uppercase tracking-widest" style={{ color: '#3a5070' }}>CAP</span>
          <span className="text-[13px] font-semibold tabular-nums" style={{ color: '#20b8d8' }}>{heading}</span>
        </span>
      )}

      {knots != null && (
        <span className="flex items-center gap-1" data-testid="hud-speed" title="Vitesse sol (GPS)">
          <span className="text-[9px] uppercase tracking-widest" style={{ color: '#3a5070' }}>SOL</span>
          <span className="text-[13px] font-semibold tabular-nums" style={{ color: '#20d880' }}>{knots}</span>
          <span className="text-[9px]" style={{ color: '#3a5070' }}>kt</span>
        </span>
      )}
    </div>
  )
}
