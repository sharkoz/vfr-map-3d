#!/usr/bin/env tsx
/**
 * Script de collecte des espaces aériens France depuis l'API OpenAIP.
 * Usage : npm run fetch-data
 * Prérequis : VITE_OPENAIP_API_KEY dans .env.local
 */

import { writeFileSync, mkdirSync, readFileSync } from 'fs'
import { resolve } from 'path'
import * as https from 'https'

// Charger les variables d'environnement depuis .env.local
function loadEnv() {
  try {
    const envPath = resolve(process.cwd(), '.env.local')
    const content = readFileSync(envPath, 'utf-8')
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq === -1) continue
      const key = trimmed.slice(0, eq).trim()
      const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '')
      if (key && !(key in process.env)) {
        process.env[key] = value
      }
    }
  } catch {
    // .env.local absent
  }
}

// Requête HTTPS via le module natif Node (contourne les problèmes de DNS avec fetch)
function httpsGet(path: string, apiKey: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.core.openaip.net',
      path,
      headers: { 'x-openaip-api-key': apiKey },
    }
    https.get(options, (res) => {
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        try {
          if (res.statusCode && res.statusCode >= 400) {
            reject(new Error(`Erreur API ${res.statusCode}: ${data}`))
          } else {
            resolve(JSON.parse(data))
          }
        } catch (e) {
          reject(e)
        }
      })
    }).on('error', reject)
  })
}

// Types OpenAIP v2 → types internes
// Source : analyse des données France (api.core.openaip.net)
const TYPE_MAP: Record<number, string> = {
  0:  'OTHER',
  1:  'RESTRICTED',      // Zones R (LF-R...)
  2:  'DANGER',          // Zones D (LF-D...)
  3:  'PROHIBITED',      // Zones P (LF-P...)
  4:  'CTR',             // CTR
  5:  'OTHER',           // TMZ (Transponder Mandatory Zone)
  6:  'OTHER',           // RMZ (Radio Mandatory Zone)
  7:  'TMA',             // TMA
  8:  'OTHER',           // TMA (variante)
  9:  'OTHER',           // FIZ
  10: 'FIR',             // FIR
  11: 'UIR',             // UIR
  12: 'OTHER',           // ADIZ
  13: 'OTHER',           // AIRWAY
  14: 'OTHER',           // MTR
  15: 'ATZ',             // ATZ
  16: 'OTHER',           // MATZ
  17: 'OTHER',           // TFR
  18: 'OTHER',           // ALERT
  19: 'OTHER',           // WARNING
  20: 'OTHER',           // ASR
  21: 'OTHER',           // Protected/Special (gliding, vol libre...)
  22: 'OTHER',           // HTZ
  23: 'OTHER',           // Gliding sector
  24: 'OTHER',           // TRP
  25: 'OTHER',           // TRVP
  26: 'TMA',             // CTA (Control Area)
  27: 'OTHER',           // ACC
  28: 'PARACHUTING',     // SPORT (aérobatie, parachutage)
  29: 'ORNITHOLOGICAL',  // Parcs/réserves naturelles
  30: 'OTHER',           // Vol libre
  31: 'DANGER',          // Zones militaires temporaires
  32: 'OTHER',           // TRIGGER
  33: 'SIV',             // SIV (Service d'Information de Vol)
  34: 'OTHER',           // LTA (Low Traffic Area)
}

// Classes OACI OpenAIP v2
const CLASS_MAP: Record<number, string> = {
  0: 'A', 1: 'B', 2: 'C', 3: 'D', 4: 'E', 5: 'F', 6: 'G',
  // 7, 8 = non classé (TMZ, RMZ, zones spéciales) → null
}

// Unités d'altitude OpenAIP v2 (champ numérique)
const ALTITUDE_UNIT_MAP: Record<number, string> = {
  1: 'FT',
  6: 'FL',
}
// Référentiels d'altitude OpenAIP v2 (champ numérique)
const ALTITUDE_DATUM_MAP: Record<number, string> = {
  0: 'AGL',
  1: 'AMSL',
  2: 'STD',   // utilisé avec FL
}

function mapAltitude(alt: Record<string, unknown>) {
  if (!alt) return { value: 0, unit: 'FT', reference: 'AGL' }
  const rawUnit  = Number(alt.unit          ?? 1)
  const rawDatum = Number(alt.referenceDatum ?? 0)
  return {
    value:     Number(alt.value ?? 0),
    unit:      ALTITUDE_UNIT_MAP[rawUnit]  ?? 'FT',
    reference: ALTITUDE_DATUM_MAP[rawDatum] ?? 'AGL',
  }
}

async function fetchAirspaces(apiKey: string) {
  console.log('📡 Fetch espaces aériens France depuis OpenAIP...')

  const allFeatures: unknown[] = []
  let page = 1
  let hasMore = true

  while (hasMore) {
    const path = `/api/airspaces?country=FR&page=${page}&limit=1000`
    console.log(`  → Page ${page}...`)

    const json = await httpsGet(path, apiKey) as { items?: unknown[]; totalCount?: number }
    const items = json.items ?? []

    for (const item of items) {
      const it = item as Record<string, unknown>
      const geometry = it.geometry as Record<string, unknown>
      if (!geometry) continue

      const rawType = Number(it.type ?? 0)
      const rawClass = Number(it.icaoClass ?? it.class ?? -1)
      // icaoClass 7/8 = non classé (RMZ, TMZ, zones spéciales)
      const airspaceClass = rawClass >= 0 && rawClass <= 6
        ? (CLASS_MAP[rawClass] ?? null)
        : null

      allFeatures.push({
        type: 'Feature',
        geometry,
        properties: {
          id: String(it._id ?? it.id ?? ''),
          name: String(it.name ?? ''),
          type: TYPE_MAP[rawType] ?? 'OTHER',
          class: airspaceClass,
          lowerLimit: mapAltitude(it.lowerLimit as Record<string, unknown>),
          upperLimit: mapAltitude(it.upperLimit as Record<string, unknown>),
          frequency: it.frequency
            ? String((it.frequency as Record<string, unknown>).value ?? '')
            : undefined,
          callsign: it.callsign ? String(it.callsign) : undefined,
          country: 'FR',
          rawType,
        },
      })
    }

    console.log(`  ✓ ${items.length} zones (total: ${allFeatures.length})`)

    const totalCount = Number(json.totalCount ?? items.length)
    hasMore = allFeatures.length < totalCount && items.length > 0
    page++
  }

  return { type: 'FeatureCollection', features: allFeatures }
}

async function main() {
  loadEnv()

  const apiKey = process.env.VITE_OPENAIP_API_KEY
  if (!apiKey) {
    console.error('❌ VITE_OPENAIP_API_KEY manquant dans .env.local')
    process.exit(1)
  }

  try {
    const geojson = await fetchAirspaces(apiKey)

    const outputDir = resolve(process.cwd(), 'public/data')
    mkdirSync(outputDir, { recursive: true })

    const outputPath = resolve(outputDir, 'airspace-france.geojson')
    writeFileSync(outputPath, JSON.stringify(geojson, null, 2))

    console.log(`\n✅ ${geojson.features.length} zones sauvegardées → ${outputPath}`)
  } catch (err) {
    console.error('❌ Erreur:', err instanceof Error ? err.message : err)
    process.exit(1)
  }
}

main()
