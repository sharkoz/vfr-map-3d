import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { DownloadManager } from './DownloadManager'
import type { AirspaceCollection } from '@/types/airspace'

const mockOnClose = vi.fn()

vi.mock('@/db', () => ({
  saveAirspace: vi.fn(),
  clearAll: vi.fn(),
  loadAirspace: vi.fn(() => Promise.resolve(null)),
  isAirspaceFresh: vi.fn(() => Promise.resolve(false)),
}))

const mockGeoJSON: AirspaceCollection = {
  type: 'FeatureCollection',
  features: [],
}

describe('DownloadManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("n'affiche rien quand isOpen=false", () => {
    const { container } = render(
      <DownloadManager isOpen={false} onClose={mockOnClose} />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('affiche le panel quand isOpen=true', () => {
    render(<DownloadManager isOpen={true} onClose={mockOnClose} />)
    expect(screen.getByTestId('download-manager')).toBeInTheDocument()
    expect(screen.getByText('Données hors-ligne')).toBeInTheDocument()
  })

  it('ferme au clic sur l\'overlay', () => {
    render(<DownloadManager isOpen={true} onClose={mockOnClose} />)
    fireEvent.click(screen.getByTestId('download-manager-overlay'))
    expect(mockOnClose).toHaveBeenCalledOnce()
  })

  it('ferme au clic sur le bouton fermer', () => {
    render(<DownloadManager isOpen={true} onClose={mockOnClose} />)
    fireEvent.click(screen.getByLabelText('Fermer'))
    expect(mockOnClose).toHaveBeenCalledOnce()
  })

  it('affiche le bouton télécharger', () => {
    render(<DownloadManager isOpen={true} onClose={mockOnClose} />)
    expect(screen.getByText(/Télécharger pour hors-ligne/)).toBeInTheDocument()
  })

  it('lance le téléchargement et appelle saveAirspace', async () => {
    const { saveAirspace } = await import('@/db')
    vi.mocked(saveAirspace).mockResolvedValue(undefined)

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockGeoJSON,
    } as Response)

    render(<DownloadManager isOpen={true} onClose={mockOnClose} />)
    fireEvent.click(screen.getByText(/Télécharger pour hors-ligne/))

    await waitFor(() => {
      expect(saveAirspace).toHaveBeenCalledWith(mockGeoJSON)
    })
    expect(screen.getByText(/Téléchargement terminé/)).toBeInTheDocument()
  })

  it('affiche le bouton supprimer quand des données existent', async () => {
    const { loadAirspace } = await import('@/db')
    vi.mocked(loadAirspace).mockResolvedValue(mockGeoJSON)

    render(<DownloadManager isOpen={true} onClose={mockOnClose} />)

    await waitFor(() => {
      expect(screen.getByText(/Supprimer les données/)).toBeInTheDocument()
    })
  })

  it('appelle clearAll au clic sur supprimer', async () => {
    const { loadAirspace, clearAll } = await import('@/db')
    vi.mocked(loadAirspace).mockResolvedValue(mockGeoJSON)
    vi.mocked(clearAll).mockResolvedValue(undefined)

    render(<DownloadManager isOpen={true} onClose={mockOnClose} />)

    await waitFor(() => {
      expect(screen.getByText(/Supprimer les données/)).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText(/Supprimer les données/))

    await waitFor(() => {
      expect(clearAll).toHaveBeenCalledOnce()
    })
  })

  it('affiche un message d\'erreur si le téléchargement échoue', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
    } as Response)

    render(<DownloadManager isOpen={true} onClose={mockOnClose} />)
    fireEvent.click(screen.getByText(/Télécharger pour hors-ligne/))

    await waitFor(() => {
      expect(screen.getByText(/Erreur HTTP 503/)).toBeInTheDocument()
    })
  })
})
