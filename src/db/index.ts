import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { AirspaceCollection } from '@/types/airspace'

// Schéma de la base de données IndexedDB
interface VfrDB extends DBSchema {
  airspace: {
    key: string
    value: {
      id: string
      data: AirspaceCollection
      fetchedAt: number
    }
  }
  settings: {
    key: string
    value: {
      key: string
      value: unknown
    }
  }
}

const DB_NAME = 'vfr-ulm-france'
// v2 : vide le cache airspace pour forcer le rechargement avec le nouveau format d'altitude
const DB_VERSION = 2

let dbInstance: IDBPDatabase<VfrDB> | null = null

export async function getDB(): Promise<IDBPDatabase<VfrDB>> {
  if (dbInstance) return dbInstance

  dbInstance = await openDB<VfrDB>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, _newVersion, transaction) {
      // Store pour les espaces aériens
      if (!db.objectStoreNames.contains('airspace')) {
        db.createObjectStore('airspace', { keyPath: 'id' })
      }

      // Store pour les préférences utilisateur
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' })
      }

      // v2 : invalider le cache airspace (ancien format unit='6' au lieu de 'FL')
      if (oldVersion < 2) {
        transaction.objectStore('airspace').clear()
        console.info('[DB] Migration v2 : cache airspace vidé (rechargement du nouveau format)')
      }
    },
  })

  return dbInstance
}

// TTL pour les données cachées (en millisecondes)
export const TTL = {
  AIRSPACE: 7 * 24 * 60 * 60 * 1000,  // 7 jours
}

// --- Airspace ---

export async function saveAirspace(data: AirspaceCollection): Promise<void> {
  const db = await getDB()
  await db.put('airspace', {
    id: 'france',
    data,
    fetchedAt: Date.now(),
  })
}

export async function loadAirspace(): Promise<AirspaceCollection | null> {
  const db = await getDB()
  const entry = await db.get('airspace', 'france')
  if (!entry) return null
  return entry.data
}

export async function isAirspaceFresh(): Promise<boolean> {
  const db = await getDB()
  const entry = await db.get('airspace', 'france')
  if (!entry) return false
  return Date.now() - entry.fetchedAt < TTL.AIRSPACE
}

// --- Nettoyage ---

export async function clearAll(): Promise<void> {
  const db = await getDB()
  await db.clear('airspace')
}
