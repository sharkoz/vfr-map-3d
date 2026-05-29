# CLAUDE.md — VFR ULM France

> Ce fichier est la source de vérité pour Claude Code.
> Il est mis à jour à chaque session. Lire en priorité avec `TODO.md`.

---

## 🎯 Objectif du projet

Progressive Web App (PWA) installable sur mobile pour les pilotes ULM en France.
- Carte interactive des espaces aériens VFR
- Fonctionne **hors-ligne** après téléchargement des données
- Explication en français de ce qui est autorisé/interdit par zone
- NOTAM avec cache offline

---

## 📂 Structure du projet

```
/mnt/c/Users/cosme/workspace/vfr/   (= /home/cosme/workspace/vfr via symlink WSL)
├── CLAUDE.md              ← ce fichier
├── TODO.md                ← todolist avec avancement
├── package.json
├── vite.config.ts
├── vitest.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── public/
│   ├── manifest.json      ← PWA manifest (intégré dans vite.config.ts)
│   ├── icons/             ← icônes app (à générer)
│   └── data/
│       └── airspace-france.geojson  ← données airspace (test pour l'instant)
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── test-setup.ts      ← setup vitest + jest-dom
│   ├── components/
│   │   ├── Map/
│   │   │   ├── Map.tsx           ← composant carte principal (MapLibre + PMTiles)
│   │   │   └── Map.test.tsx
│   │   ├── ZonePanel/
│   │   │   ├── ZonePanel.tsx     ← popup info zone (slide-up)
│   │   │   └── ZonePanel.test.tsx
│   │   ├── LayerControl/
│   │   │   ├── LayerControl.tsx  ← filtres couches
│   │   │   └── LayerControl.test.tsx
│   │   ├── DownloadManager/      ← à créer (Phase 3.2)
│   │   └── NotamOverlay/         ← à créer (Phase 4.2)
│   ├── hooks/
│   │   ├── useGeolocation.ts     ← GPS position ✅
│   │   ├── useAirspace.ts        ← charge airspace (IndexedDB ou fichier) ✅
│   │   ├── useNotam.ts           ← fetch + cache NOTAM ✅
│   │   └── useOnlineStatus.ts    ← détection connectivité ✅
│   ├── db/
│   │   └── index.ts              ← IndexedDB via idb ✅
│   ├── store/
│   │   └── index.ts              ← Zustand store ✅
│   ├── utils/
│   │   ├── airspaceColors.ts     ← couleurs OACI par classe ✅
│   │   └── zoneDescription.ts    ← textes ULM en français ✅
│   └── types/
│       └── airspace.ts           ← interfaces TypeScript ✅
├── scripts/
│   └── fetch-openAIP.ts          ← script de collecte données ✅
└── sw.ts                         ← Service Worker (géré par Workbox via vite.config.ts)
```

---

## 🛠️ Stack technique

| Outil | Version | Rôle |
|-------|---------|------|
| Vite | 8 | Bundler + dev server |
| React | 19 | UI framework |
| TypeScript | 6 | Typage |
| MapLibre GL JS | 5 | Rendu carte vectorielle |
| PMTiles | 4 | Tuiles offline (format archive) |
| Zustand | 5 | État global (avec persist) |
| idb | 8 | IndexedDB wrapper |
| Tailwind CSS | 4 (via @tailwindcss/vite) | Styles |
| vite-plugin-pwa | latest | Service Worker + manifest |
| Vitest | 4 | Tests unitaires |
| @testing-library/react | 16 | Tests composants |
| jsdom | **25** (pas v27 — incompatible WSL npm Windows) | Environnement test |

---

## ⚠️ Particularités environnement

**WSL + node Linux (nvm)** — *migré depuis npm Windows le 2026-05-29* :
- `/home/cosme/workspace/vfr` est un symlink vers `/mnt/c/Users/cosme/workspace/vfr`
- **node Linux** via nvm : `/home/cosme/.nvm/versions/node/<version>/bin` (actuellement v24.16.0, npm 11)
- `node_modules` contient les **bindings natifs Linux** (`@rolldown/binding-linux-x64-gnu`, `@esbuild/linux-x64`, `lightningcss-linux-x64-gnu`, `@tailwindcss/oxide-linux-x64-gnu`)
- ⚠️ Le shell des commandes Claude Code est **non-login / non-interactif** → nvm n'est pas chargé automatiquement.
  Préfixer le PATH si besoin : `export PATH="/home/cosme/.nvm/versions/node/v24.16.0/bin:$PATH"`.
  Persistance prévue via `BASH_ENV=/home/cosme/.claude/shell-env.sh` (à activer dans `.claude/settings.local.json`).
- `@rolldown/binding-win32-x64-msvc` **retiré** de `package.json` (inutile/incompatible sur Linux ;
  rolldown résout `binding-linux-x64-gnu` automatiquement)
- `jsdom@25` conservé (mise à jour vers v27+ possible désormais sur node Linux, non testée)
- Le fichier `.claude/` est géré par Claude Code dans ce répertoire

---

## 🗺️ Données

### Espaces aériens — OpenAIP
- **URL API :** `https://api.openaip.net/api/airspaces?country=FR`
- **Auth :** header `x-openaip-api-key: <KEY>`
- **Clé API :** à stocker dans `.env.local` → `VITE_OPENAIP_API_KEY`
- **Format output :** GeoJSON FeatureCollection
- **Mise à jour :** lancer `npm run fetch-data` (script Phase 2.1)

### Fond de carte — Protomaps PMTiles
- **URL de téléchargement France :** vérifier https://protomaps.com/downloads
- **Style JSON :** style Protomaps OSM (https://github.com/protomaps/basemaps)
- **Stockage offline :** Cache API via Service Worker

### NOTAM
- **Source :** OpenAIP NOTAM endpoint (clé API requise)
- **Cache :** IndexedDB store `notam`, TTL 1h
- **Fallback :** badge "⚠️ NOTAM du [date] — non actualisés"

---

## 🏷️ Types de zones aériennes (France)

| Type | Classe | Couleur | Règle ULM |
|------|--------|---------|-----------|
| Classe G | G | Vert | Libre (VFR) |
| Classe E | E | Jaune pâle | VFR sans clairance, radio conseillée |
| CTR | D/C | Orange | Clairance obligatoire |
| TMA | D/C/B | Orange foncé | Clairance obligatoire |
| Classe A/B | A/B | Rouge | Interdit ULM |
| Zone P | P | Rouge vif | Interdit absolu |
| Zone R | R | Rouge | Interdit sauf autorisation |
| Zone D | D | Magenta | Dangereux, éviter si activé |
| SIV | - | Bleu clair | Information de vol disponible |
| Parachutage | - | Violet | Vigilance, éviter si activé |
| Ornithologique | - | Vert foncé | Contraintes saisonnières |

---

## 🔑 Variables d'environnement

```
# .env.local (ne pas committer)
VITE_OPENAIP_API_KEY=xxxxx
```

---

## 📋 Conventions de code

- **Tests** : co-localisés avec le fichier source (`Foo.tsx` → `Foo.test.tsx`)
- **Composants** : PascalCase dans leur propre dossier
- **Hooks** : `use` prefix, camelCase
- **Types** : interfaces dans `src/types/`
- **Commits** : `feat:`, `fix:`, `test:`, `chore:` prefix
- **Langue** : code en anglais, UI et commentaires en français
- **Imports** : utiliser alias `@/` pour `src/`

---

## ▶️ Commandes

```bash
# Développement
npm run dev

# Tests (watch mode)
npm run test

# Tests (run once)
npm run test:run

# Build production
npm run build

# Preview build
npm run preview

# Fetch/mise à jour données airspace
npm run fetch-data
```

---

## 🔄 Procédure de reprise de session

1. Lire `TODO.md` → trouver la première tâche non cochée dans "Session en cours"
2. Lire `CLAUDE.md` (ce fichier) pour le contexte technique
3. Vérifier l'état du projet : `ls src/` et `npm run test:run`
4. Reprendre à la tâche indiquée
5. Mettre à jour la section "Session en cours" dans `TODO.md` en fin de session

---

## ⚠️ Points d'attention

- **PMTiles + MapLibre** : `new Protocol()` de pmtiles, puis `maplibregl.addProtocol('pmtiles', protocol.tile)`
- **GPS sur mobile** : nécessite HTTPS (pas de `http://localhost` sur vrai téléphone)
- **PWA iOS** : Service Worker limité sur Safari, tester spécifiquement
- **OpenAIP rate limits** : ne pas fetcher trop souvent, utiliser le fichier bundlé en dev
- **CORS** : l'API OpenAIP peut nécessiter un proxy en dev → configuré dans `vite.config.ts`
- **Mock constructeurs dans Vitest** : utiliser `vi.fn(function() {...})` (pas arrow function)
