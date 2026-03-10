# 🍷 Cave à Vin

Application web de gestion de cave à vin — pensée pour un usage quotidien depuis un iPhone, déployable sur NAS Synology.

---

## Fonctionnalités

### Gestion de la cave
- Crée des **sections** (ex : armoire basse, rack mural) avec colonnes et rangées personnalisables
- **Hauteur variable par colonne** : chaque colonne peut avoir un nombre de rangées différent (ex : A=5, B=8, C=3…)
- **Numérotation automatique** : colonnes étiquetées A, B, C… et rangées 1, 2, 3… dans la vue cave
- Visualise ta cave sous forme de **grille interactive** avec repères visuels
- Glisse-dépose les bouteilles dans les emplacements (drag & drop sur desktop)
- Photo de fond personnalisable par section

### Inventaire des bouteilles
- Importe des photos d'étiquettes (appareil photo, galerie, ou glisser-déposer sur desktop)
- Édite manuellement : domaine, appellation, cépage, millésime, contenance
- Champ **détail de l'obtention** (achat domaine, cadeau, enchères…)
- **Statut** de chaque bouteille avec cycle de vie automatique :
  - `À ranger` — bouteille importée, pas encore placée
  - `En cave` — placée dans un emplacement (mis à jour automatiquement)
  - `Consommée / Offerte` — retirée de l'inventaire actif
- **Commentaire de consommation** (notes de dégustation, occasion…)

### Historique
- Les bouteilles marquées *Consommée / Offerte* disparaissent de l'inventaire
- Elles sont archivées dans un onglet **Historique** dédié avec leurs commentaires

### Interface mobile — iPhone 14 Pro
- Navigation en barre du bas (style app native)
- Vue Cave : onglets *Cave* / *À placer* sur mobile
- Modals en bottom sheet (glissent depuis le bas de l'écran)
- Support Dynamic Island et home bar (safe-area insets)
- Ajout depuis l'appareil photo ou la galerie en un tap

### Authentification
- Compte administrateur unique protégé par JWT (30 jours)
- Identifiants configurables via variables d'environnement

---

## Stack technique

| Composant | Technologie |
|-----------|-------------|
| Backend | FastAPI (Python 3.12) |
| Frontend | React 18 + Vite + TypeScript + Tailwind CSS |
| Base de données | SQLite (SQLModel + aiosqlite) |
| Drag & drop | @dnd-kit |
| Déploiement | Docker multi-stage (frontend buildé dans l'image) |
| Mises à jour auto NAS | Watchtower |
| CI/CD | GitHub Actions → ghcr.io |

---

## Installation

### 1. Cloner le projet

```bash
git clone https://github.com/fabsou49/wine-cave.git
cd wine-cave
```

### 2. Configurer l'environnement

```bash
cp .env.example .env
```

Édite `.env` :
```env
SECRET_KEY=une-clé-secrète-longue-et-aléatoire
ADMIN_USERNAME=admin
ADMIN_PASSWORD=ton-mot-de-passe
PORT=8080
```

### 3. Lancer

```bash
docker compose up --build
```

Disponible sur **http://localhost:8080**

---

## Déploiement sur NAS Synology

### Première installation

1. Copie `docker-compose.nas.yml` et `.env` dans `/volume1/docker/wine-cave/`
2. Dans **Container Manager** → Projet → sélectionne le dossier → Build
3. Accède via `http://nas-ip:8080`

> Reverse proxy HTTPS : DSM → Portail de connexion → Proxy inversé → `localhost:8080`

### Mises à jour automatiques

Le fichier `docker-compose.nas.yml` inclut **Watchtower** : il vérifie toutes les 5 minutes si une nouvelle image est disponible sur `ghcr.io` et redémarre le conteneur automatiquement.

Pour forcer une mise à jour manuelle :
```bash
docker compose -f docker-compose.nas.yml pull
docker compose -f docker-compose.nas.yml up -d
```

---

## Migrations de base de données

Les nouvelles colonnes sont ajoutées automatiquement au démarrage via `migrate_db()` (lecture `PRAGMA table_info` + `ALTER TABLE` idempotent). **Aucune donnée existante n'est jamais écrasée.**

---

## Structure du projet

```
wine-cave/
├── backend/
│   ├── app/
│   │   ├── routers/
│   │   │   ├── auth.py        # POST /api/auth/login
│   │   │   ├── bottles.py     # CRUD bouteilles + /history
│   │   │   └── sections.py    # CRUD sections + slots
│   │   ├── core/
│   │   │   └── security.py    # JWT, vérification credentials
│   │   ├── models.py          # SQLModel : Section, Slot, Bottle
│   │   ├── database.py        # SQLite async + migrate_db()
│   │   └── main.py            # App FastAPI, lifespan
│   ├── Dockerfile             # Multi-stage : build frontend + runtime Python
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── Cave.tsx       # Vue cave + drag & drop
│       │   ├── Inventory.tsx  # Inventaire actif
│       │   ├── History.tsx    # Bouteilles consommées/offertes
│       │   └── Login.tsx
│       └── components/
│           ├── Layout.tsx     # Nav desktop + bottom nav mobile
│           ├── LabelForm.tsx  # Modal édition bouteille
│           ├── CaveView.tsx   # Grille des emplacements
│           ├── SlotCell.tsx   # Cellule drop target
│           └── BottleCard.tsx # Carte draggable
├── docker-compose.yml         # Dev local
├── docker-compose.nas.yml     # NAS + Watchtower
└── .env.example
```

---

## Données persistantes

Stockées dans `./data/` (volume Docker) :

| Chemin | Contenu |
|--------|---------|
| `data/cave.db` | Base de données SQLite |
| `data/uploads/bottles/` | Photos d'étiquettes |
| `data/uploads/sections/` | Photos de fond des sections |

---

## Changelog

### v4 — Grille asymétrique + numérotation des emplacements
- **Nouveau** : nombre de rangées configurable individuellement par colonne (casiers de hauteurs différentes)
- **Nouveau** : numérotation A/B/C… sur les colonnes et 1/2/3… sur les rangées dans la vue cave
- **Nouveau** : tooltip de chaque emplacement affiche sa référence (ex : "B4")
- **Amélioré** : modal de création de section avec inputs individuels par colonne et compteur total d'emplacements
- **Technique** : `column_rows` stocké en JSON sur `Section`, migration safe au démarrage

### v3 — Cycle de vie des bouteilles + ergonomie iPhone
- **Nouveau** : champ *Détail de l'obtention* par bouteille
- **Nouveau** : statut avec 3 états (`à ranger` / `en cave` / `consommé/offerte`) et synchronisation automatique avec le placement en slot
- **Nouveau** : champ *Commentaire* disponible pour les bouteilles consommées/offertes
- **Nouveau** : page **Historique** — les bouteilles consommées/offertes n'apparaissent plus dans l'inventaire
- **Nouveau** : `GET /api/bottles/history` — endpoint dédié
- **Amélioré** : `migrate_db()` — ajout de colonnes sans jamais écraser les données existantes
- **Amélioré** : Cave mobile — onglets *Cave* / *À placer* au lieu d'un sidebar inaccessible
- **Amélioré** : modals en bottom sheet sur iPhone
- **Amélioré** : support Dynamic Island / home bar (viewport-fit=cover, safe-area insets)
- **Amélioré** : navigation bottom bar avec 4 onglets (Cave, Inventaire, Historique, Déconnexion)
- **Supprimé** : intégration Ollama (OCR vision local)
- **Supprimé** : analyse sommelier + recherche DuckDuckGo
- **Supprimé** : page Paramètres (adresse Ollama)

---

## Licence

MIT
