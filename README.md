# 🍷 Cave à Vin

Application web de gestion de cave à vin avec reconnaissance d'étiquettes par IA locale (Ollama), analyse sommelier enrichie par recherche web, et interface responsive pensée pour l'iPhone.

---

## Fonctionnalités

### OCR d'étiquettes par IA locale
- Photographie ou importe une étiquette → l'IA extrait automatiquement : domaine, cépage, appellation, millésime, contenance
- Modèle **llama3.2-vision** via [Ollama](https://ollama.com) — entièrement local, aucune donnée envoyée sur internet
- Correction automatique de l'orientation EXIF (photos PC, Android, iPhone)

### Analyse sommelier enrichie
- Après lecture de l'étiquette, clique sur **Analyser** pour obtenir :
  - Type de vin (rouge, blanc, rosé, effervescent…)
  - Période d'apogée estimée
  - Accords mets-vins
- L'analyse est enrichie par une **recherche web DuckDuckGo** en temps réel pour des résultats précis et à jour
- Modèle texte **llama3.2:3b** — rapide et léger

### Gestion de la cave
- Crée des **sections** (ex : armoire basse, rack mural) avec un nombre de rangées et colonnes personnalisable
- Visualise ta cave sous forme de **grille interactive**
- Glisse-dépose les bouteilles dans les emplacements (drag & drop)
- Chaque emplacement affiche la bouteille qui l'occupe

### Interface responsive — iPhone natif
- Sur mobile : deux boutons d'import directs
  - 📷 **Appareil photo** — ouvre la caméra arrière directement
  - 🖼️ **Photothèque** — sélectionne depuis la galerie
- Navigation en barre du bas (style app native)
- Sur desktop : zone de glisser-déposer multi-fichiers
- Barre de progression lors d'imports multiples

### Confidentialité totale
- Tout tourne **localement** sur ta machine
- Aucune clé API externe requise
- Tes photos ne quittent jamais ton réseau

---

## Stack technique

| Composant | Technologie |
|-----------|-------------|
| Backend | FastAPI (Python) |
| Frontend | React + Vite + TypeScript + Tailwind CSS |
| Base de données | SQLite (via SQLModel + aiosqlite) |
| IA vision (OCR) | llama3.2-vision via Ollama |
| IA texte (analyse) | llama3.2:3b via Ollama |
| Recherche web | DuckDuckGo Search |
| Déploiement | Docker Compose |

---

## Prérequis

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Ollama](https://ollama.com) installé et en cours d'exécution
- GPU recommandé : **RTX 3060 / 4060 ou équivalent (8 Go VRAM)** pour des performances optimales

---

## Installation

### 1. Cloner le projet

```bash
git clone https://github.com/fabsou49/wine-cave.git
cd wine-cave
```

### 2. Télécharger les modèles IA

```bash
ollama pull llama3.2-vision   # OCR des étiquettes (~7.8 Go)
ollama pull llama3.2:3b       # Analyse sommelier (~2 Go)
```

### 3. Configurer l'environnement

```bash
cp .env.example .env
```

Le fichier `.env` par défaut est prêt à l'emploi :
```env
OLLAMA_HOST=http://host.docker.internal:11434
PORT=8080
```

> Si Ollama tourne sur une autre machine, remplace `host.docker.internal` par l'IP de cette machine.

### 4. Lancer l'application

```bash
docker compose up --build
```

L'application est disponible sur **http://localhost:8080**

---

## Guide utilisateur

### Importer une bouteille

**Depuis un PC :**
1. Va dans l'onglet **Inventaire**
2. Glisse une ou plusieurs photos d'étiquettes dans la zone de dépôt
3. L'IA lit automatiquement l'étiquette (domaine, cépage, millésime…)

**Depuis un iPhone (ou mobile) :**
1. Connecte-toi sur `http://[IP-de-ton-PC]:8080` depuis Safari
2. Appuie sur 📷 **Appareil photo** pour photographier directement une étiquette
3. Ou appuie sur 🖼️ **Photothèque** pour sélectionner une photo existante

### Vérifier et corriger les données

Si l'IA n'a pas lu correctement l'étiquette :
1. Clique sur **Éditer** sur la carte de la bouteille
2. Corrige manuellement les champs
3. Sauvegarde

### Analyser un vin

1. Dans l'inventaire, clique sur **Analyser** sur une bouteille
2. L'application recherche des informations sur internet et génère une analyse sommelier
3. Les résultats s'affichent : type de vin, apogée, accords mets-vins

### Gérer la cave

1. Va dans l'onglet **Cave**
2. Crée une section (ex : "Rack salon" — 4 rangées × 6 colonnes)
3. Dans l'inventaire, glisse une bouteille vers un emplacement de la cave
4. La cave affiche visuellement toutes les bouteilles placées

### Configurer l'adresse Ollama

Si Ollama tourne sur une machine différente du serveur Docker :
1. Va dans **Paramètres**
2. Saisis l'URL du serveur Ollama (ex : `http://192.168.1.10:11434`)
3. Sauvegarde — la configuration persiste entre les redémarrages

---

## Déploiement sur NAS Synology

1. Copie le dossier dans `/volume1/docker/wine-cave/`
2. Dans **Container Manager** → Projet → pointe sur le dossier → Build
3. Accède via `http://nas-ip:8080`
4. Configure l'adresse Ollama depuis l'onglet Paramètres de l'app

> Reverse proxy HTTPS : DSM → Portail de connexion → Proxy inversé → pointe sur `localhost:8080`
> Éviter les ports 80, 443, 5000, 5001 (utilisés par DSM)

---

## Structure du projet

```
wine-cave/
├── backend/
│   ├── app/
│   │   ├── routers/          # Endpoints API (bouteilles, sections, analyse, settings)
│   │   ├── services/
│   │   │   ├── ollama.py     # OCR (llama3.2-vision) + analyse (llama3.2:3b)
│   │   │   └── web_search.py # Enrichissement via DuckDuckGo
│   │   ├── models.py         # Modèles SQLModel (Section, Slot, Bottle)
│   │   ├── database.py       # SQLite async
│   │   └── main.py           # App FastAPI
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── pages/            # Cave, Inventaire, Paramètres
│       └── components/       # Layout, CaveView, BottleCard…
├── docker-compose.yml
└── .env.example
```

---

## Données persistantes

Toutes les données sont stockées dans `./data/` (monté en volume Docker) :

| Fichier | Contenu |
|---------|---------|
| `data/cave.db` | Base de données SQLite |
| `data/settings.json` | Configuration (adresse Ollama) |
| `data/uploads/bottles/` | Photos d'étiquettes |
| `data/uploads/sections/` | Photos de fond des sections |

---

## Licence

MIT
