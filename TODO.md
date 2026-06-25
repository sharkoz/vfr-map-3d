# VFR ULM France — Todo List

> **Comment reprendre :** lire ce fichier + `CLAUDE.md` pour le contexte technique.
> Cocher `[x]` au fur et à mesure. La section **"Session en cours"** indique où on en est.

---

## 🔖 Session en cours

**Dernière session :** 2026-05-29  
**Statut :** Phase 6.2 README + Phase 6.3 packaging Docker (Dockerfile/nginx/compose) ✅ — 174 tests ✅ — Build OK  
**Prochaine tâche :** Phase 4.2 — NotamOverlay (⚠️ en pause : attente compte autorouter.aero, inscrit 2026-05-29) — sinon : build/test image Docker sur le serveur, test PWA Android/iOS

---

## Phase 1 — Fondations du projet

### 1.1 Init projet
- [x] Créer le projet Vite + React + TypeScript (`npm create vite@latest`)
- [x] Installer les dépendances core : `maplibre-gl`, `pmtiles`, `zustand`, `idb`
- [x] Installer les dépendances dev : `vitest`, `@testing-library/react`, `@testing-library/user-event`, `jsdom`, `tailwindcss`
- [x] Configurer Tailwind CSS
- [x] Configurer Vitest (`vitest.config.ts`)
- [x] Configurer les path aliases TypeScript (`@/` → `src/`)
- [ ] Vérifier `npm run dev` fonctionne
- [x] Vérifier `npm run test` fonctionne — **62 tests ✅**

### 1.2 PWA — Manifest & Service Worker
- [x] Installer `vite-plugin-pwa` (Workbox)
- [x] Créer `public/manifest.json` (nom, icônes, couleurs, orientation) — intégré dans vite.config.ts
- [x] Configurer `vite.config.ts` pour le plugin PWA
- [ ] Générer les icônes app (512x512, 192x192, maskable)
- [ ] Tester l'installabilité PWA dans Chrome DevTools (Lighthouse)

### 1.3 Carte de base (MapLibre + PMTiles offline)
- [x] Créer le composant `<Map />` avec MapLibre GL JS
- [x] Intégrer le plugin PMTiles (`pmtiles` natif)
- [ ] Configurer le style de carte OSM via Protomaps (style JSON)
- [x] Centrer la carte sur la France (lat: 46.6, lon: 2.3, zoom: 6)
- [x] Ajouter les contrôles de navigation (zoom, orientation)
- [x] **Test :** rendu carte sans erreur console
- [x] **Test :** la carte s'initialise avec les bonnes coordonnées

### 1.4 Géolocalisation GPS
- [x] Créer le hook `useGeolocation.ts`
- [x] Afficher le marqueur de position GPS sur la carte
- [x] Afficher le cercle de précision — couches `gps-accuracy` (fill+line) via `circlePolygon`
- [x] Bouton "Centrer sur ma position" — géré via requestPosition()
- [x] Gérer les erreurs (permission refusée, timeout)
- [x] **Test :** hook retourne les états `loading`, `error`, `position`
- [x] **Test :** gérer le cas permission refusée

### 1.5 Layout mobile-first
- [x] Créer le layout principal (`App.tsx` avec layout absolu)
- [x] Header minimal (titre + bouton hors-ligne)
- [x] Barre de filtres de couches (bas de l'écran)
- [x] La carte prend toute la hauteur disponible
- [ ] **Test :** rendu sans crash sur viewport 375x812 (iPhone)

---

## Phase 2 — Espaces aériens

### 2.1 Script de collecte OpenAIP
- [x] Créer `scripts/fetch-openAIP.ts`
- [ ] S'inscrire sur OpenAIP et obtenir une clé API (à documenter)
- [x] Fetcher les espaces aériens France (`/api/airspaces?country=FR`)
- [x] Normaliser en GeoJSON (`FeatureCollection`)
- [x] Mapper les types OpenAIP → types internes (CTR, TMA, Classe A-G, P, R, D, SIV...)
- [x] Sauvegarder `public/data/airspace-france.geojson`
- [ ] **Test :** validation du schéma GeoJSON output
- [ ] **Test :** toutes les propriétés requises sont présentes

### 2.2 Modèle de données airspace
- [x] Définir l'interface TypeScript `AirspaceFeature`
  - `id`, `name`, `type`, `class`, `lowerLimit`, `upperLimit`, `activity`, `frequency`, `description`
- [x] Créer `utils/airspaceColors.ts` — code couleur OACI par classe/type
- [x] Créer `utils/zoneDescription.ts` — textes ULM en français par type de zone
- [x] **Test :** `getZoneColor()` retourne les bonnes couleurs par classe
- [x] **Test :** `getZoneDescription()` couvre tous les types de zones

### 2.3 Rendu des zones sur la carte
- [x] Créer le hook `useAirspace.ts` — charge depuis IndexedDB ou fichier bundlé
- [x] Ajouter la source GeoJSON dans MapLibre
- [x] Couche fill (polygones semi-transparents colorés par classe)
- [x] Couche line (bordures)
- [x] Couche symbol (labels des zones si zoom suffisant)
- [x] **Test :** les zones s'affichent sans erreur MapLibre
- [x] **Test :** les couleurs correspondent au code OACI (expressions MapLibre)

### 2.4 Interaction — Popup info zone
- [x] Détecter le click/tap sur une zone — structure prête dans Map.tsx
- [x] Créer le composant `<ZonePanel />`
- [x] Afficher : nom, classe, limites verticales, horaires, fréquence radio
- [x] Afficher le **message ULM** en français (ce qui est autorisé/interdit)
- [x] Animation slide-up depuis le bas (mobile)
- [x] Fermeture en swipe-down ou tap extérieur
- [x] **Test :** click sur zone → panel s'ouvre avec les bonnes données
- [x] **Test :** click hors zone → panel se ferme

### 2.5 Filtres par type de zone
- [x] Créer le composant `<LayerControl />`
- [x] Filtres : Classe G | CTR/TMA | Classe C/D | Zones P/R/D | SIV/Para
- [ ] Persistance des préférences de filtres (localStorage) — via Zustand persist ✅
- [x] **Test :** toggle filtre masque/affiche les zones correspondantes
- [ ] **Test :** préférences restaurées au rechargement

---

## Phase 3 — Offline & PWA complète

### 3.1 IndexedDB — Stockage des données
- [x] Créer `db/index.ts` — initialisation idb, définition des stores
- [x] Store `airspace` — zones aériennes GeoJSON
- [x] Store `notam` — NOTAM avec timestamp de fetch
- [x] Store `settings` — préférences utilisateur
- [ ] **Test :** lecture/écriture dans chaque store
- [ ] **Test :** migration de schéma (version bump)

### 3.2 Download Manager — Téléchargement offline
- [x] Créer le composant `<DownloadManager />`
- [x] Bouton "Télécharger pour usage hors-ligne"
- [ ] Télécharger et stocker les tuiles PMTiles France (avec progression)
- [x] Télécharger et stocker le GeoJSON airspace dans IndexedDB
- [ ] Afficher l'espace utilisé / taille estimée
- [x] Bouton "Supprimer les données offline"
- [x] **Test :** mock fetch → données stockées en IndexedDB
- [x] **Test :** affichage correct de la progression (status done/error)

### 3.3 Service Worker — Stratégie de cache
- [x] Configurer Workbox dans `vite.config.ts`
- [x] Cache shell de l'app (assets JS/CSS) — `CacheFirst`
- [x] Cache fichiers de données — `StaleWhileRevalidate`
- [x] Cache tuiles carte — `CacheFirst` avec limite de taille
- [x] Ne jamais cacher les NOTAM (fetch network-first)
- [ ] **Test :** app fonctionne en mode offline (DevTools → Offline)

### 3.4 Indicateur de connectivité
- [x] Créer le hook `useOnlineStatus.ts`
- [x] Badge "Hors-ligne" dans le header si pas de réseau
- [x] Toast notification lors du passage online/offline — toast transitoire (3.5s) dans App.tsx
- [x] **Test :** changement d'état online/offline détecté

---

## Phase 4 — NOTAM

### 4.1 Fetch NOTAM avec cache
- [ ] Rechercher l'API NOTAM disponible (SIA, OpenAIP, ou ICAO API)
- [x] Créer le hook `useNotam.ts`
  - Si réseau → fetch + stocker en IndexedDB avec timestamp
  - Si hors-ligne → charger depuis IndexedDB
- [x] Afficher badge "⚠️ NOTAM du JJ/MM HH:MM — non actualisés" si cache
- [x] **Test :** fetch réussi → données en IndexedDB
- [x] **Test :** hors-ligne → données depuis cache avec badge d'avertissement
- [x] **Test :** cache expiré (>24h) → avertissement renforcé

### 4.2 Affichage NOTAM sur la carte
- [ ] Créer le composant `<NotamOverlay />`
- [ ] Afficher les NOTAM géolocalisés (zones temporaires)
- [ ] Style distinct des zones permanentes (hachuré, couleur différente)
- [ ] Popup NOTAM : référence, texte, validité
- [ ] Filtre ON/OFF pour les NOTAM
- [ ] **Test :** NOTAM s'affiche sur la carte
- [ ] **Test :** toggle filtre masque/affiche les NOTAM

---

## Phase 5 — Fonctionnalités avancées & Polish

### 5.1 Filtre altitudinal ✅ (implémenté via `userCeiling`)
- [x] Slider "altitude max" — slider "Plafond carte" 500 ft → FL195 dans LayerControl
- [x] Masquer les zones dont le plancher est au-dessus — `buildMapFilter` : `_floorFt < userCeiling`
- [x] Affichage par défaut adapté ULM — défaut 3500 ft (couvre zones basses + CTR/TMA bas)
- [x] **Test :** filtre altitude masque les zones (Map.test « intègre le plafond utilisateur ») + slider (LayerControl.test)

### 5.2 Mode nuit / lisibilité ✅
- [x] Détecter `prefers-color-scheme: dark` (premier lancement uniquement, sinon préférence persistée)
- [x] Style carte sombre — fond OSM assombri via `raster-*` (brightness/saturation/contrast/hue-rotate)
- [x] Ajustement des couleurs de zones pour contraste nocturne (opacité fills + labels clairs/halo sombre)
- [x] Toggle manuel dans l'interface (bouton 🌙/☀️ dans le header, persisté via Zustand)
- [x] **Test :** mode nuit assombrit OSM + adapte les labels — mode jour pleine luminosité (2 tests)

### 5.3 Aérodromes et terrains ULM ✅
- [x] Fetcher les aérodromes depuis OpenAIP (`/api/airports?country=FR`) — 760 aérodromes dont 299 ULM
- [x] Filtrer par type : AFIS, non-contrôlé, ULM, hélisurface (AIRFIELD/ULTRA_LIGHT/HELIPORT/AIRPORT/CIVIL/GLIDER/SEAPLANE)
- [x] Couche circle MapLibre colorée par type (bleu=civil, vert=ULM, rouge=militaire, violet=héliport)
- [x] Popup AirportPanel : nom, ICAO, fréquences, pistes (cap + surface)
- [x] Toggle ON/OFF dans LayerControl
- [x] **Test :** AirportPanel (12 tests) — useAirports (3 tests) — Map couche airports (2 tests)

### 5.4 Mesures et outils ✅
- [x] Afficher le cap et la vitesse sol (depuis GPS) — composant `<HUD />` (cap 3 chiffres, vitesse en nœuds)
- [x] Afficher les coordonnées du centre de la carte — `mapCenter` (store) alimenté sur `move`, format lat/lon hémisphères
- [ ] Outil de mesure de distance (optionnel) — non implémenté (optionnel)
- [x] **Test :** `geoFormat` (msToKnots/formatHeading/formatLatLon — 9 tests) + `HUD` (5 tests)

### 5.5 Optimisations performances mobile
- [x] Code splitting — `Map` (MapLibre+PMTiles) et `DownloadManager` en `React.lazy`/`Suspense`
      → shell initial 229 kB (vs 1294 kB), chunk Map 1059 kB chargé en différé
- [ ] Compression GeoJSON (topojson ou simplification)
- [ ] Limiter le nombre de zones rendues selon le zoom
- [ ] Audit Lighthouse > 90 (Performance + PWA)
- [ ] **Test :** premier rendu < 3s sur réseau 3G simulé

---

## Phase 6 — Qualité & Déploiement

### 6.1 Tests end-to-end
- [ ] Installer Playwright
- [ ] Test E2E : chargement app → carte visible
- [ ] Test E2E : tap sur zone → panel s'ouvre
- [ ] Test E2E : mode offline (mock SW) → app fonctionnelle

### 6.2 Documentation
- [x] README.md complet (setup, développement, déploiement) + `.env.local.example`
- [x] Documenter la procédure de mise à jour des données airspace (`fetch-data` / `fetch-airports`)
- [x] Documenter l'API OpenAIP utilisée (clé, header, endpoints)

### 6.3 Déploiement
- [x] Configurer le build de production (`npm run build` — vérifié, dist OK)
- [x] Choisir l'hébergement : **self-hosted via Docker** (Dockerfile multi-stage + nginx + docker-compose)
- [ ] Configurer HTTPS (reverse proxy en amont — Traefik/Caddy/nginx — à faire côté serveur)
- [ ] Builder/tester l'image Docker (⚠️ Docker absent du WSL de dev — à faire sur le serveur)
- [ ] Tester l'installation PWA sur Android et iOS
- [ ] Tester le mode offline sur vrai téléphone

---

## ✅ Terminé

- **2026-05-27** — Phase 1.1 Init projet (Vite + React + TS + Tailwind + Vitest + aliases)
- **2026-05-27** — Phase 1.2 PWA manifest + Workbox configurés dans vite.config.ts
- **2026-05-27** — Phase 1.3 Composant Map de base (MapLibre + PMTiles)
- **2026-05-27** — Phase 1.4 Hook useGeolocation + marqueur GPS
- **2026-05-27** — Phase 1.5 Layout mobile-first (App.tsx)
- **2026-05-27** — Phase 2.1 Script fetch-openAIP.ts + GeoJSON de test
- **2026-05-27** — Phase 2.2 Types TypeScript + airspaceColors + zoneDescription
- **2026-05-27** — Phase 2.4 Composant ZonePanel (slide-up)
- **2026-05-27** — Phase 2.5 Composant LayerControl (filtres)
- **2026-05-27** — Phase 3.1 IndexedDB (db/index.ts)
- **2026-05-27** — Phase 3.2 DownloadManager + toast chargement + bouton GPS
- **2026-05-27** — Phase 3.4 Hook useOnlineStatus + badge hors-ligne
- **2026-05-27** — Phase 4.1 Hook useNotam avec cache IndexedDB
- **2026-05-27** — Phase 5.3 Aérodromes (760 terrains France) — 97 tests ✅
- **2026-05-29** — Phase 5.2 Mode nuit (fond OSM assombri + toggle 🌙/☀️ + détection système) — 158 tests ✅
- **2026-05-29** — Phase 5.1 Filtre altitudinal confirmé (userCeiling) + Phase 5.4 HUD mesures (cap/vitesse GPS + coords centre) — 171 tests ✅
- **2026-05-29** — Phase 5.5 code splitting (Map/DownloadManager lazy) — shell 229 kB
- **2026-05-29** — Phase 1.4 cercle de précision GPS + Phase 3.4 toast online/offline — 174 tests ✅
- **2026-05-29** — Phase 6.2 Documentation : README projet complet (setup, données, offline, déploiement) + `.env.local.example`
- **2026-05-29** — Phase 6.3 Packaging déploiement : Dockerfile multi-stage (Node build → nginx) + nginx.conf (SPA/PWA) + docker-compose.yml + .dockerignore — build vérifié (Docker absent du WSL → image à builder sur serveur)

---

## 📝 Notes & Décisions

- **OpenAIP** choisi pour les données airspace (API gratuite, format propre)
- **PMTiles OSM via Protomaps** pour le fond de carte offline
- **NOTAM** : fetch réseau avec fallback cache IndexedDB + badge d'avertissement
- Espaces aériens : types à couvrir → CTR, TMA, Classe A/B/C/D/E/G, Zones P/R/D, SIV, parachutage, ornithologique
- ULM opèrent principalement en Classe G sous 1000ft AGL (quelques exceptions)
- **WSL + npm Windows** : jsdom v25 requis (v27 incompatible), `@rolldown/binding-win32-x64-msvc` à installer manuellement
- **Stack actuelle** : Vite 8 + React 19 + TS 6 + Tailwind v4 + Vitest 4 + jsdom 25
