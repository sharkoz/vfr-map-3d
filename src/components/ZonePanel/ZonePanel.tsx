import { useEffect, useRef } from 'react'
import { useAppStore } from '@/store'
import { getZoneDescription, formatAltitude } from '@/utils/zoneDescription'
import type { AirspaceFeature } from '@/types/airspace'

interface ZonePanelProps {
  zone: AirspaceFeature | null
}

export function ZonePanel({ zone }: ZonePanelProps) {
  const setSelectedZone = useAppStore((s) => s.setSelectedZone)
  const panelRef = useRef<HTMLDivElement>(null)

  const isOpen = zone !== null

  // Gestion du swipe vers le bas pour fermer
  useEffect(() => {
    if (!panelRef.current || !isOpen) return
    const el = panelRef.current

    let startY = 0
    const onTouchStart = (e: TouchEvent) => { startY = e.touches[0].clientY }
    const onTouchEnd = (e: TouchEvent) => {
      const delta = e.changedTouches[0].clientY - startY
      if (delta > 80) setSelectedZone(null) // swipe down > 80px → fermer
    }

    el.addEventListener('touchstart', onTouchStart)
    el.addEventListener('touchend', onTouchEnd)
    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchend', onTouchEnd)
    }
  }, [isOpen, setSelectedZone])

  if (!zone) return null

  const { name, type, class: cls, lowerLimit, upperLimit, frequency, callsign } = zone.properties
  const desc = getZoneDescription(type, cls)

  const colorMap = {
    green: 'bg-green-50 border-green-200 text-green-800',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    orange: 'bg-orange-50 border-orange-200 text-orange-800',
    red: 'bg-red-50 border-red-200 text-red-800',
    purple: 'bg-purple-50 border-purple-200 text-purple-800',
    blue: 'bg-blue-50 border-blue-200 text-blue-800',
  }

  return (
    <>
      {/* Overlay pour fermer en tapant en dehors */}
      <div
        className="fixed inset-0 z-40"
        onClick={() => setSelectedZone(null)}
        data-testid="zone-panel-overlay"
        aria-hidden="true"
      />

      {/* Panel slide-up */}
      <div
        ref={panelRef}
        role="dialog"
        aria-label={`Informations zone ${name}`}
        data-testid="zone-panel"
        className={`
          fixed bottom-0 left-0 right-0 z-50
          bg-white rounded-t-2xl shadow-2xl
          max-h-[70vh] overflow-y-auto
          transition-transform duration-300 ease-out
          ${isOpen ? 'translate-y-0' : 'translate-y-full'}
        `}
      >
        {/* Handle swipe */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between px-4 py-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl" role="img" aria-label={desc.title}>
                {desc.icon}
              </span>
              <h2 className="text-lg font-semibold text-gray-900 leading-tight">
                {name}
              </h2>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">{desc.title}</p>
          </div>
          <button
            onClick={() => setSelectedZone(null)}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>

        {/* Règle ULM */}
        <div className={`mx-4 mb-3 p-3 rounded-xl border ${colorMap[desc.color]}`}>
          <p className="font-semibold text-sm">{desc.rule}</p>
          <p className="text-xs mt-1 opacity-90">{desc.details}</p>
        </div>

        {/* Infos techniques */}
        <div className="px-4 pb-6 grid grid-cols-2 gap-3">
          <InfoCard label="Plancher" value={formatAltitude(lowerLimit)} />
          <InfoCard label="Plafond" value={formatAltitude(upperLimit)} />
          {cls && <InfoCard label="Classe" value={`Classe ${cls}`} />}
          {frequency && (
            <InfoCard label="Fréquence" value={`${frequency} MHz`} />
          )}
          {callsign && <InfoCard label="Indicatif" value={callsign} />}
        </div>
      </div>
    </>
  )
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-xl p-3">
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-gray-900">{value}</p>
    </div>
  )
}
