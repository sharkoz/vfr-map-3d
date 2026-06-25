import { useState, useEffect } from 'react'
import { saveAirspace, clearAll, loadAirspace } from '@/db'
import type { AirspaceCollection } from '@/types/airspace'

interface DownloadManagerProps {
  isOpen: boolean
  onClose: () => void
}

type Status = 'idle' | 'downloading' | 'done' | 'error'

const panelStyle: React.CSSProperties = {
  background:    'rgba(10,16,28,0.99)',
  backdropFilter: 'blur(16px)',
  borderTop:     '1px solid rgba(42,68,100,0.5)',
}

export function DownloadManager({ isOpen, onClose }: DownloadManagerProps) {
  const [status,       setStatus]       = useState<Status>('idle')
  const [hasData,      setHasData]      = useState(false)
  const [dataSize,     setDataSize]     = useState<string | null>(null)
  const [lastDownload, setLastDownload] = useState<string | null>(null)
  const [errorMsg,     setErrorMsg]     = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    loadAirspace().then((data) => {
      if (data) {
        setHasData(true)
        setDataSize((new Blob([JSON.stringify(data)]).size / 1024 / 1024).toFixed(1) + ' Mo')
      }
    })
  }, [isOpen])

  const handleDownload = async () => {
    setStatus('downloading')
    setErrorMsg(null)
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}data/airspace-france.geojson`)
      if (!res.ok) throw new Error(`Erreur HTTP ${res.status}`)
      const data: AirspaceCollection = await res.json()
      await saveAirspace(data)
      setDataSize((new Blob([JSON.stringify(data)]).size / 1024 / 1024).toFixed(1) + ' Mo')
      setLastDownload(new Date().toLocaleDateString('fr-FR'))
      setHasData(true)
      setStatus('done')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erreur inconnue')
      setStatus('error')
    }
  }

  const handleClear = async () => {
    await clearAll()
    setHasData(false)
    setDataSize(null)
    setLastDownload(null)
    setStatus('idle')
  }

  if (!isOpen) return null

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)' }}
        onClick={onClose}
        data-testid="download-manager-overlay"
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        data-testid="download-manager"
        role="dialog"
        aria-label="Téléchargement offline"
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl shadow-2xl"
        style={panelStyle}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(42,68,100,0.5)' }} />
        </div>

        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: '1px solid rgba(42,68,100,0.3)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="rounded-xl p-2"
              style={{ background: 'rgba(32,184,216,0.1)', border: '1px solid rgba(32,184,216,0.2)' }}
            >
              <svg
                className="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#20b8d8"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
            </div>
            <h2 className="font-display font-bold text-base tracking-wide" style={{ color: '#c8d8e8' }}>
              Données hors-ligne
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: '#3a5070' }}
            aria-label="Fermer"
            onMouseEnter={e => (e.currentTarget.style.color = '#c8d8e8')}
            onMouseLeave={e => (e.currentTarget.style.color = '#3a5070')}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="px-4 py-4 space-y-3 pb-8">

          {/* Data status card */}
          <div
            className="rounded-xl p-4 flex items-center justify-between"
            style={{ background: 'rgba(7,12,20,0.7)', border: '1px solid rgba(42,68,100,0.4)' }}
          >
            <div>
              <p className="font-display font-semibold text-sm tracking-wide" style={{ color: '#c8d8e8' }}>
                Espaces aériens France
              </p>
              <p className="font-data text-xs mt-0.5" style={{ color: '#3a5070', fontSize: '11px' }}>
                {dataSize
                  ? `${dataSize} disponibles${lastDownload ? ` · ${lastDownload}` : ''}`
                  : 'Non téléchargés'}
              </p>
            </div>
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{
                background: hasData ? 'rgba(32,216,128,0.1)' : 'rgba(42,68,100,0.3)',
                border: hasData ? '1px solid rgba(32,216,128,0.3)' : '1px solid rgba(42,68,100,0.4)',
              }}
            >
              <span style={{ fontSize: '16px' }}>{hasData ? '✓' : '○'}</span>
            </div>
          </div>

          {/* Progress bar */}
          {status === 'downloading' && (
            <div
              className="h-1 rounded-full overflow-hidden"
              style={{ background: 'rgba(42,68,100,0.4)' }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: '60%',
                  background: 'linear-gradient(90deg, #20b8d8, #f0a020)',
                  animation: 'pulse 1.5s ease-in-out infinite',
                }}
              />
            </div>
          )}

          {/* Success message */}
          {status === 'done' && (
            <div
              className="rounded-xl px-4 py-3"
              style={{ background: 'rgba(32,216,128,0.08)', border: '1px solid rgba(32,216,128,0.2)' }}
            >
              <p className="font-display text-sm tracking-wide" style={{ color: '#20d880' }}>
                ✓ Téléchargement terminé — l'app fonctionne maintenant hors-ligne.
              </p>
            </div>
          )}

          {/* Error message */}
          {status === 'error' && (
            <div
              className="rounded-xl px-4 py-3"
              style={{ background: 'rgba(240,60,60,0.08)', border: '1px solid rgba(240,60,60,0.2)' }}
            >
              <p className="font-display text-sm tracking-wide" style={{ color: '#f06060' }}>
                ⚠ {errorMsg}
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-col gap-2">
            <button
              onClick={handleDownload}
              disabled={status === 'downloading'}
              className="w-full font-display font-bold text-sm py-3 rounded-xl tracking-wide transition-all duration-200 disabled:opacity-40"
              style={{
                background: status === 'downloading'
                  ? 'rgba(32,184,216,0.1)'
                  : 'rgba(32,184,216,0.15)',
                border: '1px solid rgba(32,184,216,0.35)',
                color: '#20b8d8',
              }}
            >
              {status === 'downloading' ? '⟳ Téléchargement…' : '⬇ Télécharger pour hors-ligne'}
            </button>

            {hasData && (
              <button
                onClick={handleClear}
                className="w-full font-display font-medium text-sm py-2.5 rounded-xl tracking-wide transition-all duration-200"
                style={{
                  background: 'rgba(42,68,100,0.2)',
                  border: '1px solid rgba(42,68,100,0.35)',
                  color: '#3a5070',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(240,60,60,0.08)'
                  e.currentTarget.style.borderColor = 'rgba(240,60,60,0.25)'
                  e.currentTarget.style.color = '#f06060'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(42,68,100,0.2)'
                  e.currentTarget.style.borderColor = 'rgba(42,68,100,0.35)'
                  e.currentTarget.style.color = '#3a5070'
                }}
              >
                🗑 Supprimer les données offline
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
