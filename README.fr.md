<p align="center"><img src="icon.png" width="120" alt="Icône de LightCraft Bridge"></p>

<h1 align="center">LightCraft MCP Server</h1>

<p align="center">
  <a href="README.md">English</a> · <a href="README.es.md">Español</a> · <a href="README.pt-BR.md">Português</a> · <b>Français</b> · <a href="README.de.md">Deutsch</a> · <a href="README.ru.md">Русский</a> · <a href="README.zh-CN.md">简体中文</a> · <a href="README.ja.md">日本語</a> · <a href="README.ko.md">한국어</a>
</p>

<p align="center">
  Laissez Claude développer vos photos et fichiers RAW avec le <b>LightCraft</b> installé sur votre ordinateur — <b>Windows, macOS et Linux</b> :<br>
  tons automatiques, balance des blancs, paramètres prédéfinis, masques, correction des taches, HDR et panoramas, tri, et export en JPEG, TIFF, WebP, AVIF et DNG.
</p>

---

## Pourquoi

[LightCraft](https://github.com/storytold/lightcraft) est une photothèque et un dérawtiseur open source de niveau Lightroom, écrit en Rust, avec une CLI sans interface (`lightcraft-cli`), 240 commandes, 114 réglages de développement et un mode MCP. Ce serveur [Model Context Protocol](https://modelcontextprotocol.io) transforme ce moteur en **outils fichier → fichier** pour Claude, pour demander par exemple :

> *« Développe tous les RAW de `D:\Mariage\ceremonie` avec tons automatiques, balance lumière du jour et +15 de clarté, et exporte des JPEG à 2048 px avec mon filigrane. »*
> *« Applique mon paramètre Lightroom `Moody.xmp` à ces photos et enregistre-les en TIFF 16 bits Adobe RGB. »*
> *« Assombris le ciel de `lac.dng` avec un filtre gradué et éclaircis le sujet avec un masque radial. »*
> *« Fusionne ces 3 bracketings en un DNG HDR, et assemble ce dossier en panorama. »*
> *« Dans cette rafale, garde seulement les photos les plus nettes et copie-les dans `D:\Selection`. »*

Projet frère de [photocraft-mcp-server](https://github.com/jhonsu01/photocraft-mcp-server), [vectorcraft-mcp-server](https://github.com/jhonsu01/vectorcraft-mcp-server), [filmcraft-mcp-server](https://github.com/jhonsu01/filmcraft-mcp-server), [pdfcraft-mcp-server](https://github.com/jhonsu01/pdfcraft-mcp-server) et [audacity-mcp-server](https://github.com/jhonsu01/audacity-mcp-server).

## Plateformes

| Système | Paquet LightCraft à installer | Où le serveur le trouve (sans réglage) | État |
| --- | --- | --- | --- |
| **Windows** 10/11 (x64, x86, arm64) | MSI ou zip portable | `C:\Program Files\LightCraft`, `%LOCALAPPDATA%\Programs\LightCraft`, `PATH` | ✅ Vérifié (Windows 11) |
| **Linux** (x86_64, aarch64) | `.deb`, `.rpm` ou `.tar.gz` | `/usr/bin`, `/usr/local/bin`, `/opt/lightcraft/bin`, `~/.local/bin`, `PATH` | ✅ Vérifié (Debian 12, sans interface) |
| **macOS** 11+ (Apple silicon et Intel) | `.dmg` (l'app) **plus** `lightcraft-cli-<version>-macos-universal.zip` | `/Applications/LightCraft.app`, `/usr/local/bin`, `/opt/homebrew/bin`, `~/.local/bin`, `~/bin`, `PATH` | 🟡 Pris en charge, pas encore testé sur Mac |

Téléchargements : [versions de LightCraft](https://github.com/storytold/lightcraft/releases) (il existe aussi un tar.gz pour FreeBSD ; pointez `LIGHTCRAFT_DIR` dessus). Ailleurs : définissez `LIGHTCRAFT_DIR` (dossier, racine du `.tar.gz` ou `LightCraft.app`) ou `LIGHTCRAFT_CLI`.

- **macOS :** le DMG ne contient que l'app. Décompressez le zip séparé de `lightcraft-cli` et déplacez `lightcraft-cli` dans `/usr/local/bin` (ou pointez `LIGHTCRAFT_CLI` dessus). Le premier lancement vérifie en ligne la notarisation d'Apple.
- **Linux :** l'AppImage et le Flatpak ne contiennent que l'app, sans `lightcraft-cli` ; utilisez le deb, le rpm ou le tar.gz. Si l'app est un AppImage, définissez `LIGHTCRAFT_APP` pour que `open_in_lightcraft` puisse la lancer. Sur un serveur sans GPU, la configuration vérifiée utilisait `libxkbcommon0 libvulkan1 libegl1 mesa-vulkan-drivers libasound2 fontconfig`.

## Fonctionnement

| Élément | Description |
| --- | --- |
| **Moteur LightCraft** (`lightcraft-cli mcp`) | Le moteur de LightCraft lui-même : décodeurs RAW, développement, masques, correction, Fusion de photos et exportateurs. Relancé à neuf et **sans interface** pour chaque tâche avec une **photothèque jetable**, il ne touche donc jamais à votre photothèque LightCraft ni à une fenêtre ouverte. |
| **Serveur MCP** (Node.js) | 10 outils de haut niveau. Il importe vos photos par référence (elles sont seulement lues ; aucun XMP n'est écrit à côté), applique les réglages et exporte là où vous l'avez demandé. Les fusions travaillent sur des copies privées : rien n'apparaît à côté de vos originaux. Il valide les chemins et n'écrase jamais rien. |
| **App en direct** (facultatif) | `open_in_lightcraft control=true` lance l'app avec son canal de contrôle uniquement local (port 7980) et `run_lightcraft_commands live=true` la pilote, ainsi que sa photothèque. |

## Outils

| Outil | Rôle |
| --- | --- |
| `develop_photos` | Tons automatiques, balance des blancs (préréglages, Kelvin, pipette), n'importe lequel des 114 réglages, paramètres prédéfinis (aussi `.xmp` / `.lrtemplate` de Lightroom) et profils, noir et blanc, courbe des tonalités, recadrage / format / redressement / Upright, rotation / symétrie, correction des taches, poussières et yeux rouges, masques (dégradé, radial, luminance, couleur, pinceau, sujet, ciel, arrière-plan) avec réglages locaux, toute commande du moteur ; une photo, une liste ou un dossier ; export avec taille, qualité, poids maximal, espace colorimétrique, profondeur, accentuation, métadonnées et filigrane |
| `convert_photos` | RAW et photos vers JPEG, PNG, TIFF, WebP, AVIF ou DNG tels quels, redimensionnés, par lots |
| `render_preview` | Une photo telle que Claude la voit, éventuellement avec un essai de réglage (rien n'est écrit sauf demande) |
| `get_photo_info` | Appareil, objectif, exposition, date de prise de vue, GPS, taille, RAW ou non, et chaque balise EXIF / XMP |
| `merge_photos` | HDR de bracketings, panorama, panorama HDR — en DNG modifiable et éventuellement en JPEG / TIFF développé |
| `analyze_photos` | Tri : notes de netteté et d'écrêtage, rafales regroupées, la plus nette de chacune copiée dans un dossier |
| `list_lightcraft_catalog` | Réglages de développement avec leurs plages, paramètres prédéfinis, profils, courbes, préréglages d'export, 240 commandes, formats |
| `run_lightcraft_commands` | Toutes commandes du moteur dans une session (références `$steps[N].champ`), sans interface ou dans l'app en direct |
| `open_in_lightcraft` | Ouvre des photos dans l'app LightCraft (éventuellement avec le canal de contrôle) |
| `get_lightcraft_status` | Plateforme, installation, version, commandes, réglages, app / port de contrôle |

| | |
| --- | --- |
| **Lit** | RAW : DNG, CR2, CR3, ARW, NEF, RAF (Bayer et X-Trans), RW2 / RWL, PEF, ORF, SRW · JPEG, PNG, TIFF, WebP, PSD (composite), JPEG XL |
| **Écrit** | JPEG, PNG (8/16 bits), TIFF (8/16/32 bits), WebP, AVIF (8/10 bits), DNG (entrées RAW, réglages intégrés), original + XMP |
| **Espaces colorimétriques** | sRGB, Display P3, Adobe RGB, ProPhoto RGB, Rec. 2020 |

Les positions (rectangles de recadrage, points de masque, taches) sont **normalisées 0..1 depuis le coin supérieur gauche**. Les masques sujet / ciel / arrière-plan utilisent les heuristiques classiques de LightCraft 0.4 (aucun modèle d'IA requis).

## Exemple

```json
{
  "input_dir": "D:\\Photos\\Voyage",
  "auto": true,
  "white_balance": { "mode": "daylight" },
  "profile": "lc.vivid",
  "values": { "light.highlights": -40, "light.shadows": 30, "effects.clarity": 15, "vignette.amount": -15 },
  "masks": [
    { "kind": "linear", "start": [0.5, 0], "end": [0.5, 0.45], "adjust": { "exposure": -0.6, "dehaze": 15 } }
  ],
  "formats": ["jpg"],
  "long_edge": 2048,
  "quality": 88,
  "watermark": "© Mon Nom",
  "output_dir": "D:\\Photos\\Voyage\\export"
}
```

## Prérequis

- **LightCraft** avec `lightcraft-cli` (testé avec **0.4.0**) ; voir [Plateformes](#plateformes)
- Node.js ≥ 20 (fourni avec Claude Desktop pour les installations `.mcpb`)

## Installation

### Claude Desktop (recommandé, toutes plateformes)

1. Téléchargez `lightcraft-mcp-server.mcpb` depuis la [dernière version](https://github.com/jhonsu01/lightcraft-mcp-server/releases/latest).
2. Double-cliquez dessus (ou glissez-le dans Claude Desktop → *Paramètres → Extensions*) puis cliquez sur **Installer**.
3. Facultatif : si LightCraft n'est pas à un emplacement standard, indiquez son dossier ou le chemin de `lightcraft-cli` dans les paramètres de l'extension.

### Codex (OpenAI)

**Recommandé — le marketplace (reçoit les mises à jour) :** *Plugins → Ajouter → Ajouter un marketplace*, source `jhonsu01/craft-marketplace`, référence `main`, puis installez **LightCraft Bridge** depuis **Craft Bridges** ([craft-marketplace](https://github.com/jhonsu01/craft-marketplace)). Les nouvelles versions arrivent en actualisant le marketplace. Ou envoyez le zip (Codex le garde dans votre compte et refuse un zip plus récent portant le même nom) :

1. Téléchargez `lightcraft-mcp-server-<version>-codex.zip` depuis la [dernière version](https://github.com/jhonsu01/lightcraft-mcp-server/releases/latest).
2. Dans Codex : *Plugins → Ajouter → Nouveau plugin*, choisissez le zip et cliquez sur **Ajouter le plugin**.
3. Codex lance le serveur avec `node` : Node.js ≥ 20 doit donc être dans le `PATH`. Si LightCraft n'est pas à un emplacement standard, définissez `LIGHTCRAFT_DIR` ou `LIGHTCRAFT_CLI` comme variables d'environnement système (Codex n'a pas de formulaire de paramètres pour les plugins locaux).

### Claude Code / autres clients MCP

```bash
git clone https://github.com/jhonsu01/lightcraft-mcp-server.git
cd lightcraft-mcp-server
npm install
npm run build
```

Windows :

```bash
claude mcp add lightcraft -- node "%CD%\dist\bundle.cjs"
```

macOS / Linux :

```bash
claude mcp add lightcraft -- node "$PWD/dist/bundle.cjs"
```

## Configuration

| Variable | Signification |
| --- | --- |
| `LIGHTCRAFT_DIR` | Dossier de LightCraft, un de ses exécutables, la racine d'un `.tar.gz` (avec `bin/`) ou `LightCraft.app`. Par défaut : détection automatique |
| `LIGHTCRAFT_CLI` | Chemin de `lightcraft-cli` / `lightcraft-cli.exe` (prioritaire sur `LIGHTCRAFT_DIR`) |
| `LIGHTCRAFT_APP` | Chemin de l'app de bureau lorsqu'elle est ailleurs (p. ex. un AppImage sous Linux) |
| `LIGHTCRAFT_CONTROL_PORT` | Port de contrôle de l'app de bureau (7980 par défaut) |
| `LIGHTCRAFT_MCP_TIMEOUT` | Durée maximale en secondes par appel au moteur (3600 par défaut) |

## Sécurité

- Les fichiers ne sont **jamais écrasés** sans `overwrite: true` : dans un dossier, un nom libre (`_2`) est choisi et un `output_path` existant provoque une erreur. Les originaux sont seulement lus ; aucun XMP n'est écrit à côté.
- Tous les chemins doivent être absolus. Le moteur tourne sans interface avec une photothèque jetable et ne touche jamais à votre photothèque ni à l'app LightCraft, sauf avec `live: true` (ou `open_in_lightcraft`, qui importe les photos dans la photothèque de l'app comme toute importation).
- Tout s'exécute en local, sans accès réseau. Chaque tâche utilise un moteur privé dans un dossier temporaire supprimé à la fin.

## Développement

```bash
npm run build       # TypeScript + bundle en un seul fichier (dist/bundle.cjs)
npm test            # tests unitaires (logique des chemins Windows, macOS et Linux)
npm run test:e2e    # 23 tests de bout en bout via un vrai MCP stdio (images et DNG synthétiques)
npm run pack:mcpb   # lightcraft-mcp-server.mcpb
npm run pack:codex  # zip de plugin pour Codex
```

Test Linux dans Docker (décompressez d'abord `lightcraft-<version>-linux-x86_64.tar.gz`) :

```bash
docker run --rm -v "$PWD:/work:ro" -v "/chemin/vers/lightcraft-0.4.0-linux-x86_64:/opt/lightcraft:ro" -w /work node:22-bookworm bash -c "apt-get update && apt-get install -y libxkbcommon0 libvulkan1 libegl1 mesa-vulkan-drivers libasound2 fontconfig && node scripts/e2e.mjs"
```

## Licence

Apache-2.0. LightCraft est © ses auteurs (Storytold), MIT ou Apache-2.0.
Ce projet n'est ni affilié à LightCraft ou Storytold, ni approuvé par eux. Lightroom est une marque d'Adobe.
