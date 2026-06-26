import { useEffect, useState, lazy, Suspense } from 'react'
import { ZoneStack } from '@/components/ZoneStack/ZoneStack'
import { AirportPanel } from '@/components/AirportPanel/AirportPanel'
import { LayerControl } from '@/components/LayerControl/LayerControl'
import { HUD } from '@/components/HUD/HUD'
import { CeilingSlider } from '@/components/CeilingSlider/CeilingSlider'

// Composants lourds chargés en différé (code splitting) :
// - Map embarque MapLibre GL + PMTiles (~1 Mo) → chunk séparé, chargé après le shell
// - DownloadManager n'est ouvert qu'à la demande
const Map = lazy(() =>
  import('@/components/Map/Map').then((m) => ({ default: m.Map })),
)
const DownloadManager = lazy(() =>
  import('@/components/DownloadManager/DownloadManager').then((m) => ({ default: m.DownloadManager })),
)
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { useGeolocation } from '@/hooks/useGeolocation'
import { useAppStore } from '@/store'

export default function App() {
  const isOnline        = useOnlineStatus()
  const { requestPosition } = useGeolocation()
  const selectedAirport = useAppStore((s) => s.selectedAirport)
  const airspaceLoaded  = useAppStore((s) => s.airspaceLoaded)
  const zoneStack       = useAppStore((s) => s.zoneStack)
  const darkMode        = useAppStore((s) => s.darkMode)
  const toggleDarkMode  = useAppStore((s) => s.toggleDarkMode)

  const [downloadOpen, setDownloadOpen] = useState(false)
  const [filterOpen,   setFilterOpen]   = useState(false)
  // Toast transitoire au changement de connectivité
  const [connToast, setConnToast] = useState<'online' | 'offline' | null>(null)
  const [firstStatus, setFirstStatus] = useState(true)

  useEffect(() => { requestPosition() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Au tout premier lancement (aucune préférence persistée), suivre le réglage système
  useEffect(() => {
    try {
      const noStoredPrefs = !localStorage.getItem('vfr-ulm-settings')
      const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches
      if (noStoredPrefs && prefersDark && !useAppStore.getState().darkMode) {
        toggleDarkMode()
      }
    } catch { /* matchMedia/localStorage indisponibles → mode jour par défaut */ }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Fermer le panneau filtre quand la ZoneStack s'ouvre
  useEffect(() => {
    if (zoneStack && zoneStack.length > 0) setFilterOpen(false)
  }, [zoneStack])

  // Toast lors d'un changement de connectivité (ignore l'état initial au montage)
  useEffect(() => {
    if (firstStatus) { setFirstStatus(false); return }
    setConnToast(isOnline ? 'online' : 'offline')
    const t = setTimeout(() => setConnToast(null), 3500)
    return () => clearTimeout(t)
  }, [isOnline]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="relative w-full h-full flex flex-col bg-[#070c14]">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header
        className="absolute top-0 left-0 right-0 h-14 z-50 flex items-center justify-between px-3 gap-2"
        style={{
          background: 'rgba(7,12,20,0.92)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(42,68,100,0.45)',
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 pointer-events-auto">
          <div
            className="rounded-xl p-1.5 shrink-0"
            style={{ background: 'rgba(240,160,32,0.1)', border: '1px solid rgba(240,160,32,0.2)' }}
          >
            <span className="text-base leading-none" aria-hidden>✈️</span>
          </div>
          <div className="leading-[1.1]">
            <div className="font-display font-bold text-[15px] tracking-[0.18em]" style={{ color: '#f0a020' }}>
              VFR
            </div>
            <div className="font-display text-[11px] tracking-wider" style={{ color: '#4a6585' }}>
              ULM France
            </div>
          </div>
        </div>

        {/* Actions droites */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {!isOnline && (
            <div
              className="text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5"
              style={{
                background: 'rgba(240,60,60,0.12)',
                border: '1px solid rgba(240,60,60,0.3)',
                color: '#f06060',
              }}
            >
              <span aria-hidden>📶</span>
              <span>Hors-ligne</span>
            </div>
          )}

          {/* Bouton mode nuit / jour */}
          <button
            onClick={toggleDarkMode}
            aria-pressed={darkMode}
            aria-label={darkMode ? 'Passer en mode jour' : 'Passer en mode nuit'}
            title={darkMode ? 'Mode jour' : 'Mode nuit'}
            data-testid="dark-mode-toggle"
            className="rounded-lg p-2 transition-all duration-200"
            style={darkMode ? {
              background: 'rgba(240,160,32,0.12)',
              border: '1px solid rgba(240,160,32,0.35)',
              color: '#f0a020',
            } : {
              background: 'rgba(30,48,80,0.6)',
              border: '1px solid rgba(42,68,100,0.6)',
              color: '#5a7a9a',
            }}
          >
            <span className="text-base leading-none" aria-hidden>{darkMode ? '🌙' : '☀️'}</span>
          </button>

          {/* Bouton filtres */}
          <button
            onClick={() => setFilterOpen((v) => !v)}
            aria-pressed={filterOpen}
            aria-label={filterOpen ? 'Fermer les filtres' : 'Ouvrir les filtres'}
            title="Filtres des couches"
            className="rounded-lg p-2 transition-all duration-200"
            style={filterOpen ? {
              background: 'rgba(240,160,32,0.12)',
              border: '1px solid rgba(240,160,32,0.35)',
              color: '#f0a020',
            } : {
              background: 'rgba(30,48,80,0.6)',
              border: '1px solid rgba(42,68,100,0.6)',
              color: '#5a7a9a',
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polygon points="12 2 2 7 12 12 22 7 12 2" />
              <polyline points="2 17 12 22 22 17" />
              <polyline points="2 12 12 17 22 12" />
            </svg>
          </button>

          {/* Téléchargement hors-ligne */}
          <button
            onClick={() => setDownloadOpen(true)}
            className="rounded-lg p-2 transition-all duration-200"
            style={{
              background: 'rgba(30,48,80,0.6)',
              border: '1px solid rgba(42,68,100,0.6)',
              color: '#5a7a9a',
            }}
            aria-label="Données hors-ligne"
            title="Données hors-ligne"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </button>
        </div>
      </header>

      {/* ── Panneau Filtres (collapsible) ───────────────────────────────────── */}
      <div
        aria-hidden={!filterOpen}
        className={`
          absolute left-0 top-14 z-50
          ${zoneStack?.length ? 'right-80' : 'right-0'}
          pointer-events-none
          transition-all duration-200 ease-out overflow-hidden
          ${filterOpen ? 'max-h-72 opacity-100' : 'max-h-0 opacity-0'}
        `}
      >
        <div className="px-3 pt-2 pb-3 pointer-events-auto">
          <LayerControl />
        </div>
      </div>

      {/* ── Toast chargement airspace ───────────────────────────────────────── */}
      {!airspaceLoaded && !filterOpen && (
        <div
          className="absolute top-16 left-1/2 -translate-x-1/2 z-50 rounded-xl px-4 py-2 flex items-center gap-2 text-sm pointer-events-none whitespace-nowrap"
          style={{
            background: 'rgba(13,22,40,0.92)',
            border: '1px solid rgba(42,68,100,0.5)',
            color: '#5a7a9a',
            backdropFilter: 'blur(8px)',
          }}
        >
          <span className="inline-block animate-spin" style={{ color: '#f0a020' }}>⟳</span>
          <span className="font-display text-sm tracking-wide">Chargement des espaces aériens…</span>
        </div>
      )}

      {/* ── Toast connectivité (transitoire) ────────────────────────────────── */}
      {connToast && (
        <div
          data-testid="conn-toast"
          role="status"
          className="absolute top-16 left-1/2 -translate-x-1/2 z-50 rounded-xl px-4 py-2 flex items-center gap-2 text-sm pointer-events-none whitespace-nowrap"
          style={{
            background: connToast === 'online' ? 'rgba(13,40,28,0.94)' : 'rgba(40,16,16,0.94)',
            border: `1px solid ${connToast === 'online' ? 'rgba(32,216,128,0.4)' : 'rgba(240,96,96,0.4)'}`,
            color: connToast === 'online' ? '#20d880' : '#f06060',
            backdropFilter: 'blur(8px)',
          }}
        >
          <span aria-hidden>{connToast === 'online' ? '📶' : '✈️'}</span>
          <span className="font-display text-sm tracking-wide">
            {connToast === 'online' ? 'Connexion rétablie' : 'Hors-ligne — données en cache'}
          </span>
        </div>
      )}

      {/* ── Carte (chunk différé) ──────────────────────────────────────────── */}
      <Suspense
        fallback={
          <div
            className="flex-1 flex items-center justify-center"
            style={{ background: '#070c14', color: '#3a5070' }}
          >
            <span className="inline-block animate-spin mr-2" style={{ color: '#f0a020' }}>⟳</span>
            <span className="font-display text-sm tracking-wide">Chargement de la carte…</span>
          </div>
        }
      >
        <Map className="flex-1" />
      </Suspense>

      {/* ── Curseur de plafond (toujours visible, bord gauche) ─────────────── */}
      <CeilingSlider />

      {/* ── HUD mesures (coordonnées centre + cap/vitesse GPS) ─────────────── */}
      <div
        className={`absolute bottom-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none transition-opacity duration-200 ${
          zoneStack?.length ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <HUD />
      </div>

      {/* ── Panneau zones aériennes ────────────────────────────────────────── */}
      <ZoneStack />

      {/* ── Panel aérodrome ────────────────────────────────────────────────── */}
      <AirportPanel airport={selectedAirport} />

      {/* ── Gestionnaire offline (chunk différé, monté à l'ouverture) ───────── */}
      {downloadOpen && (
        <Suspense fallback={null}>
          <DownloadManager isOpen={downloadOpen} onClose={() => setDownloadOpen(false)} />
        </Suspense>
      )}

    </div>
  )
}
