#!/usr/bin/env tsx
/**
 * Script de collecte des aérodromes France depuis l'API OpenAIP.
 * Usage : npm run fetch-airports
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

// Requête HTTPS via le module natif Node
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
// 0: Airport (civil), 1: Glider, 2: Airfield, 3: Civil, 4: Military,
// 5: Heliport, 6: Private/restricted (usage interne OpenAIP pour terrains privés),
// 7: UltraLight, 8: SeaplaneBase, 9: Airport (régional), 10: Seaplane (variant),
// 13: ULM informal/privé
const TYPE_MAP: Record<number, string> = {
  0:  'AIRPORT',
  1:  'GLIDER',
  2:  'AIRFIELD',
  3:  'CIVIL',
  4:  'MILITARY',
  5:  'HELIPORT',
  6:  'PRIVATE',      // Terrain privé (club, ferme, PPR) — pas "fermé"
  7:  'ULTRA_LIGHT',
  8:  'SEAPLANE',
  9:  'AIRPORT',      // Aéroports régionaux contrôlés (AGEN, BORDEAUX MÉRIGNAC…)
  10: 'SEAPLANE',     // Hydrobases supplémentaires
  13: 'ULTRA_LIGHT',  // Terrains ULM informels/privés
}

// Surfaces OpenAIP v2 → types internes
// Valeurs observées sur les données France (audit API)
const SURFACE_MAP: Record<number, string> = {
  0:  'ASPHALT',
  1:  'CONCRETE',
  2:  'GRASS',
  3:  'GRAVEL',
  4:  'WATER',
  5:  'OTHER',
  12: 'GRAVEL',  // Gravier compacté / macadam (observé : CROTS, FLAYOSC, TALLONE)
  13: 'OTHER',   // Terre / clay (observé : CAP DE BARRES, CORNEILLA LA RIVIÈRE)
  15: 'OTHER',   // Neige / glacier (observé : GLACIER DU TACUL)
}

function mapFrequencies(freqs: unknown[]): unknown[] {
  if (!Array.isArray(freqs)) return []
  return freqs.map((f) => {
    const freq = f as Record<string, unknown>
    return {
      value: String(freq.value ?? ''),
      type:  Number(freq.type ?? 99),
      name:  String(freq.name ?? ''),
    }
  }).filter(f => f.value !== '')  // ignorer les fréquences sans valeur
}

function mapRunways(runways: unknown[]): unknown[] {
  if (!Array.isArray(runways)) return []
  return runways.map((r) => {
    const rwy = r as Record<string, unknown>
    // Surface : surface.mainComposite → index dans SURFACE_MAP
    const surface = rwy.surface as Record<string, unknown> | undefined
    const surfaceType = surface ? Number(surface.mainComposite ?? 5) : 5
    // Longueur : dimension.length.value (objet imbriqué avec value + unit)
    const dim = rwy.dimension as Record<string, unknown> | undefined
    const dimLength = dim?.length as Record<string, unknown> | undefined
    const lengthVal = Number(dimLength?.value ?? 0)
    return {
      designator: String(rwy.designator ?? ''),
      trueHdg: Number(rwy.trueHeading ?? 0),  // champ réel OpenAIP v2
      length: lengthVal,
      surface: SURFACE_MAP[surfaceType] ?? 'OTHER',
    }
  })
}

async function fetchAirports(apiKey: string) {
  console.log('📡 Fetch aérodromes France depuis OpenAIP...')

  const allFeatures: unknown[] = []
  let page = 1
  let hasMore = true

  while (hasMore) {
    const path = `/api/airports?country=FR&page=${page}&limit=1000`
    console.log(`  → Page ${page}...`)

    const json = await httpsGet(path, apiKey) as { items?: unknown[]; totalCount?: number }
    const items = json.items ?? []

    for (const item of items) {
      const it = item as Record<string, unknown>
      const geometry = it.geometry as Record<string, unknown>
      if (!geometry || geometry.type !== 'Point') continue

      const rawType = Number(it.type ?? 0)
      const mappedType = TYPE_MAP[rawType]
      if (!mappedType) continue // Type non reconnu → ignoré

      // Élévation en pieds
      const elevObj = it.elevation as Record<string, unknown> | undefined
      let elevation = 0
      if (elevObj) {
        const val = Number(elevObj.value ?? 0)
        const unit = Number(elevObj.unit ?? 0) // 0=FT, 1=M
        elevation = unit === 1 ? Math.round(val * 3.28084) : val
      }

      allFeatures.push({
        type: 'Feature',
        geometry,
        properties: {
          id:        String(it._id ?? it.id ?? ''),
          name:      String(it.name ?? ''),
          icaoCode:  it.icaoCode ? String(it.icaoCode) : (it.altIdentifier ? String(it.altIdentifier) : null),
          iataCode:  it.iataCode ? String(it.iataCode) : null,
          type:      mappedType,
          elevation,
          private:   Boolean(it.private ?? false),
          ppr:       Boolean(it.ppr ?? false),
          frequencies: mapFrequencies((it.frequencies as unknown[]) ?? []),
          runways:     mapRunways((it.runways as unknown[]) ?? []),
          country:   'FR',
        },
      })
    }

    console.log(`  ✓ ${items.length} aérodromes (total: ${allFeatures.length})`)

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
    const geojson = await fetchAirports(apiKey)

    const outputDir = resolve(process.cwd(), 'public/data')
    mkdirSync(outputDir, { recursive: true })

    const outputPath = resolve(outputDir, 'airports-france.geojson')
    writeFileSync(outputPath, JSON.stringify(geojson, null, 2))

    // Stats par type
    const stats: Record<string, number> = {}
    for (const f of geojson.features) {
      const t = (f as { properties: { type: string } }).properties.type
      stats[t] = (stats[t] ?? 0) + 1
    }
    console.log('\n📊 Répartition :')
    for (const [type, count] of Object.entries(stats).sort((a, b) => b[1] - a[1])) {
      console.log(`   ${type}: ${count}`)
    }

    console.log(`\n✅ ${geojson.features.length} aérodromes sauvegardés → ${outputPath}`)
  } catch (err) {
    console.error('❌ Erreur:', err instanceof Error ? err.message : err)
    process.exit(1)
  }
}

main()
