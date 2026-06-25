# VFR ULM France 🛩️

Progressive Web App (PWA) installable sur mobile pour les pilotes ULM en France.

- 🗺️ Carte interactive des espaces aériens VFR (MapLibre + tuiles vectorielles PMTiles)
- 📡 Fonctionne **hors-ligne** après téléchargement des données
- 🇫🇷 Explication en français de ce qui est autorisé/interdit par zone
- 📍 Position GPS avec cap, vitesse sol et cercle de précision
- 🛬 760 aérodromes et terrains ULM de France
- 🌙 Mode nuit / lisibilité

---

## 🚀 Démarrage rapide

```bash
# 1. Installer les dépendances
npm install

# 2. Configurer la clé API OpenAIP (voir ci-dessous)
cp .env.local.example .env.local
#   puis éditer .env.local et renseigner VITE_OPENAIP_API_KEY

# 3. (optionnel) Rafraîchir les données airspace + aérodromes
npm run fetch-data
npm run fetch-airports

# 4. Lancer le serveur de développement
npm run dev
```

> ⚠️ **GPS sur mobile** : la géolocalisation nécessite HTTPS. `http://localhost`
> fonctionne en dev sur le poste, mais pas sur un vrai téléphone via IP locale.

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
| Tailwind CSS | 4 | Styles |
| vite-plugin-pwa | 1 | Service Worker + manifest (Workbox) |
| Vitest | 4 | Tests unitaires |
| @testing-library/react | 16 | Tests composants |

---

## 📂 Structure

```
src/
├── components/        Composants UI (Map, ZonePanel, LayerControl, HUD, …)
├── hooks/             useGeolocation, useAirspace, useAirports, useNotam, useOnlineStatus
├── db/                IndexedDB (idb) — stores airspace / notam / settings
├── store/             Zustand store (préférences persistées)
├── utils/             Couleurs OACI, descriptions ULM, formats géo
└── types/             Interfaces TypeScript
scripts/
├── fetch-openAIP.ts   Collecte des espaces aériens (npm run fetch-data)
└── fetch-airports.ts  Collecte des aérodromes (npm run fetch-airports)
public/data/           GeoJSON bundlés (airspace + aérodromes)
```

---

## ▶️ Commandes

```bash
npm run dev             # Serveur de développement
npm run build           # Build de production (tsc -b && vite build)
npm run preview         # Prévisualiser le build
npm run test            # Tests en watch
npm run test:run        # Tests une fois (174 tests)
npm run lint            # ESLint
npm run fetch-data      # Mise à jour des espaces aériens (OpenAIP)
npm run fetch-airports  # Mise à jour des aérodromes (OpenAIP)
```

---

## 🔑 Configuration — clé API OpenAIP

Les données d'espaces aériens et d'aérodromes proviennent d'[OpenAIP](https://www.openaip.net/).

1. Créer un compte gratuit sur [openaip.net](https://www.openaip.net/).
2. Générer une clé API dans les paramètres du compte.
3. La renseigner dans `.env.local` :

```
VITE_OPENAIP_API_KEY=votre_cle_ici
```

Les scripts `fetch-data` / `fetch-airports` lisent cette clé (header
`x-openaip-api-key`), récupèrent les données France et écrivent les GeoJSON
normalisés dans `public/data/`. En développement, l'app utilise les fichiers
bundlés — inutile d'appeler l'API à chaque lancement (respecter les rate limits).

---

## 🗺️ Données

| Source | Donnée | Mise à jour |
|--------|--------|-------------|
| OpenAIP `/api/airspaces?country=FR` | Espaces aériens (CTR, TMA, Classes A-G, P/R/D, SIV…) | `npm run fetch-data` |
| OpenAIP `/api/airports?country=FR` | 760 aérodromes / terrains ULM | `npm run fetch-airports` |
| Protomaps PMTiles | Fond de carte OSM offline | manuelle (voir CLAUDE.md) |

### Règles ULM par type de zone

| Type | Couleur | Règle ULM |
|------|---------|-----------|
| Classe G | Vert | Libre (VFR) |
| Classe E | Jaune pâle | VFR sans clairance, radio conseillée |
| CTR / TMA | Orange | Clairance obligatoire |
| Classe A/B | Rouge | Interdit ULM |
| Zone P | Rouge vif | Interdit absolu |
| Zone R | Rouge | Interdit sauf autorisation |
| Zone D | Magenta | Dangereux, éviter si activé |
| SIV | Bleu clair | Information de vol disponible |
| Parachutage | Violet | Vigilance, éviter si activé |

---

## 📡 Mode hors-ligne

1. Télécharger les données via le **Download Manager** (bouton dans l'app).
2. Le GeoJSON airspace est stocké en IndexedDB ; le shell de l'app et les tuiles
   sont cachés par le Service Worker (Workbox).
3. Hors réseau : les zones, les aérodromes et la position GPS restent
   disponibles depuis le cache. Le fond de carte (tuiles OSM en ligne) n'est
   pas mis en cache et apparaît gris sans connexion.

---

## 🚢 Déploiement

### GitHub Pages (CI/CD automatique)

L'app est un site **100 % statique** (aucun backend) : un push sur `main`
déclenche le workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)
qui build et publie sur GitHub Pages.

1. **Settings → Pages → Build and deployment → Source : GitHub Actions** (une seule fois).
2. Pousser sur `main` → le site se déploie sur
   `https://sharkoz.github.io/vfr-map-3d/`.

Le sous-chemin `/vfr-map-3d/` est géré par `base` dans `vite.config.ts` ; en
local (`npm run dev`) l'app reste servie à la racine. Aucune clé API n'est
nécessaire (données bundlées).

> ⚠️ Le fond de carte (tuiles OSM), les polices et les glyphes MapLibre sont
> chargés en ligne : la carte est pleinement fonctionnelle connectée, mais le
> fond reste gris hors-ligne (zones, aérodromes et GPS fonctionnent en cache).

### Self-hosted (Docker, alternative)

L'app est une PWA statique servie par nginx. Image multi-stage (build Node →
service nginx) fournie par le `Dockerfile`.

```bash
# Build + run direct
docker build -t vfr-ulm-france .
docker run -d -p 8080:80 --name vfr-ulm vfr-ulm-france

# ou via docker compose
docker compose up -d --build
```

L'app écoute en clair sur le port **80** dans le conteneur (mappé sur `8080`
côté hôte). Placer un **reverse proxy** (Traefik, Caddy, nginx) en amont pour
terminer le **HTTPS** — obligatoire pour le Service Worker et le GPS.

La config nginx (`nginx.conf`) gère :
- fallback SPA (`try_files … /index.html`)
- `sw.js` / `manifest.webmanifest` en `no-cache` (les MAJ PWA passent)
- assets hashés (`/assets/`) en cache long immuable
- bons types MIME pour `.geojson` (`application/geo+json`) et `.pmtiles`

> ℹ️ Aucune clé API n'est requise au build : les données sont bundlées dans
> `public/data/`. `VITE_OPENAIP_API_KEY` ne sert qu'aux scripts de
> rafraîchissement des données (`npm run fetch-data` / `fetch-airports`).

Penser à tester l'installation PWA et le mode offline sur Android **et** iOS
(Safari limite les Service Workers).

---

## 🧪 Tests

```bash
npm run test:run   # 174 tests (Vitest + Testing Library, environnement jsdom)
```

Les tests sont co-localisés avec leur source (`Foo.tsx` → `Foo.test.tsx`).

---

## 📄 Licence

Projet personnel — données aéronautiques fournies par OpenAIP et contributeurs OSM.
Les informations de cette application **ne remplacent pas** la documentation
aéronautique officielle (SIA, cartes OACI). Vérifiez toujours les sources
officielles avant un vol.
