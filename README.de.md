<p align="center"><img src="icon.png" width="120" alt="LightCraft-Bridge-Symbol"></p>

<h1 align="center">LightCraft MCP Server</h1>

<p align="center">
  <a href="README.md">English</a> · <a href="README.es.md">Español</a> · <a href="README.pt-BR.md">Português</a> · <a href="README.fr.md">Français</a> · <b>Deutsch</b> · <a href="README.ru.md">Русский</a> · <a href="README.zh-CN.md">简体中文</a> · <a href="README.ja.md">日本語</a> · <a href="README.ko.md">한국어</a>
</p>

<p align="center">
  Lassen Sie Claude Ihre Fotos und RAW-Dateien mit dem auf Ihrem Computer installierten <b>LightCraft</b> entwickeln — <b>Windows, macOS und Linux</b>:<br>
  Auto-Tonwert, Weißabgleich, Vorgaben, Masken, Bereichsreparatur, HDR und Panoramen, Aussortieren und Export als JPEG, TIFF, WebP, AVIF und DNG.
</p>

---

## Warum

[LightCraft](https://github.com/storytold/lightcraft) ist eine quelloffene Fotobibliothek und RAW-Entwicklung auf Lightroom-Niveau, geschrieben in Rust, mit einer CLI ohne Oberfläche (`lightcraft-cli`), 240 Befehlen, 114 Entwicklungsreglern und einem MCP-Modus. Dieser [Model Context Protocol](https://modelcontextprotocol.io)-Server macht daraus **Datei-zu-Datei-Werkzeuge** für Claude, sodass Sie zum Beispiel sagen können:

> *„Entwickle alle RAWs in `D:\Hochzeit\Trauung` mit Auto-Tonwert, Weißabgleich Tageslicht und +15 Klarheit und exportiere JPEGs mit 2048 px und meinem Wasserzeichen.“*
> *„Wende meine Lightroom-Vorgabe `Moody.xmp` auf diese Fotos an und speichere sie als 16-Bit-TIFF in Adobe RGB.“*
> *„Dunkle den Himmel von `see.dng` mit einem Verlaufsfilter ab und helle das Motiv mit einer Radialmaske auf.“*
> *„Füge diese 3 Belichtungsreihen zu einem HDR-DNG zusammen und setze diesen Ordner zu einem Panorama zusammen.“*
> *„Behalte aus dieser Serie nur die schärfsten Fotos und kopiere sie nach `D:\Auswahl`.“*

Schwesterprojekt von [photocraft-mcp-server](https://github.com/jhonsu01/photocraft-mcp-server), [vectorcraft-mcp-server](https://github.com/jhonsu01/vectorcraft-mcp-server), [filmcraft-mcp-server](https://github.com/jhonsu01/filmcraft-mcp-server), [pdfcraft-mcp-server](https://github.com/jhonsu01/pdfcraft-mcp-server) und [audacity-mcp-server](https://github.com/jhonsu01/audacity-mcp-server).

## Plattformen

| System | Zu installierendes LightCraft-Paket | Wo der Server es findet (ohne Einrichtung) | Status |
| --- | --- | --- | --- |
| **Windows** 10/11 (x64, x86, arm64) | MSI oder portables Zip | `C:\Program Files\LightCraft`, `%LOCALAPPDATA%\Programs\LightCraft`, `PATH` | ✅ Geprüft (Windows 11) |
| **Linux** (x86_64, aarch64) | `.deb`, `.rpm` oder `.tar.gz` | `/usr/bin`, `/usr/local/bin`, `/opt/lightcraft/bin`, `~/.local/bin`, `PATH` | ✅ Geprüft (Debian 12, ohne Oberfläche) |
| **macOS** 11+ (Apple Silicon und Intel) | `.dmg` (die App) **plus** `lightcraft-cli-<Version>-macos-universal.zip` | `/Applications/LightCraft.app`, `/usr/local/bin`, `/opt/homebrew/bin`, `~/.local/bin`, `~/bin`, `PATH` | 🟡 Unterstützt, noch nicht auf einem Mac getestet |

Downloads: [LightCraft-Releases](https://github.com/storytold/lightcraft/releases) (es gibt auch ein tar.gz für FreeBSD; `LIGHTCRAFT_DIR` darauf zeigen lassen). An anderen Orten: `LIGHTCRAFT_DIR` (Ordner, Wurzel des `.tar.gz` oder `LightCraft.app`) oder `LIGHTCRAFT_CLI` setzen.

- **macOS:** Das DMG enthält nur die App. Entpacken Sie das separate `lightcraft-cli`-Zip und verschieben Sie `lightcraft-cli` nach `/usr/local/bin` (oder setzen Sie `LIGHTCRAFT_CLI`). Beim ersten Start wird Apples Beglaubigung online geprüft.
- **Linux:** AppImage und Flatpak enthalten nur die App, nicht `lightcraft-cli`; nutzen Sie deb, rpm oder tar.gz. Ist die App ein AppImage, setzen Sie `LIGHTCRAFT_APP`, damit `open_in_lightcraft` sie starten kann. Auf einem Server ohne GPU nutzte die geprüfte Umgebung `libxkbcommon0 libvulkan1 libegl1 mesa-vulkan-drivers libasound2 fontconfig`.

## Funktionsweise

| Teil | Was es ist |
| --- | --- |
| **LightCraft-Engine** (`lightcraft-cli mcp`) | LightCrafts eigene Engine: RAW-Decoder, Entwicklung, Masken, Reparatur, Fotozusammenführung und Exporter. Für jede Aufgabe neu und **ohne Oberfläche** mit einer **Wegwerf-Bibliothek** gestartet, berührt sie nie Ihre LightCraft-Bibliothek oder ein geöffnetes Fenster. |
| **MCP-Server** (Node.js) | 10 Werkzeuge auf hoher Ebene. Importiert Ihre Fotos per Verweis (sie werden nur gelesen; keine XMP-Dateien daneben), wendet die Einstellungen an und exportiert an das gewünschte Ziel. Zusammenführungen laufen auf privaten Kopien, sodass nichts neben Ihren Originalen entsteht. Prüft Pfade und überschreibt nie. |
| **Live-App** (optional) | `open_in_lightcraft control=true` startet die App mit ihrem nur lokalen Steuerkanal (Port 7980) und `run_lightcraft_commands live=true` steuert sie samt Bibliothek. |

## Werkzeuge

| Werkzeug | Funktion |
| --- | --- |
| `develop_photos` | Auto-Tonwert, Weißabgleich (Vorgaben, Kelvin, Pipette), jeder der 114 Regler, Vorgaben (auch Lightroom-`.xmp` / `.lrtemplate`) und Profile, Schwarzweiß, Gradationskurve, Freistellen / Seitenverhältnis / Gerade ausrichten / Upright, drehen / spiegeln, Bereichsreparatur, Staub- und Rote-Augen-Entfernung, Masken (Verlauf, radial, Luminanz, Farbe, Pinsel, Motiv, Himmel, Hintergrund) mit lokalen Korrekturen, jeder Engine-Befehl; ein Foto, eine Liste oder ein Ordner; Export mit Größe, Qualität, Dateigrößenlimit, Farbraum, Bittiefe, Ausgabeschärfung, Metadaten und Wasserzeichen |
| `convert_photos` | RAWs und Fotos unverändert nach JPEG, PNG, TIFF, WebP, AVIF oder DNG, skaliert, im Stapel |
| `render_preview` | Ein Foto, wie Claude es sieht, optional mit einem Probe-Look (es wird nichts geschrieben, außer gewünscht) |
| `get_photo_info` | Kamera, Objektiv, Belichtung, Aufnahmezeit, GPS, Größe, RAW oder nicht, und jedes EXIF- / XMP-Tag |
| `merge_photos` | HDR aus Belichtungsreihen, Panorama, HDR-Panorama — als bearbeitbares DNG und optional entwickeltes JPEG / TIFF |
| `analyze_photos` | Aussortieren: Schärfe- und Clipping-Werte, Serien gruppiert, das schärfste jeder Serie in einen Ordner kopiert |
| `list_lightcraft_catalog` | Entwicklungsregler mit Bereichen, Vorgaben, Profile, Kurven, Exportvorgaben, 240 Befehle, Formate |
| `run_lightcraft_commands` | Beliebige Engine-Befehle in einer Sitzung (Verweise `$steps[N].feld`), ohne Oberfläche oder in der Live-App |
| `open_in_lightcraft` | Öffnet Fotos in der LightCraft-App (optional mit Steuerkanal) |
| `get_lightcraft_status` | Plattform, Installation, Version, Befehle, Regler, App / Steuerport |

| | |
| --- | --- |
| **Liest** | RAW: DNG, CR2, CR3, ARW, NEF, RAF (Bayer und X-Trans), RW2 / RWL, PEF, ORF, SRW · JPEG, PNG, TIFF, WebP, PSD (Komposit), JPEG XL |
| **Schreibt** | JPEG, PNG (8/16 Bit), TIFF (8/16/32 Bit), WebP, AVIF (8/10 Bit), DNG (RAW-Eingaben, Einstellungen eingebettet), Original + XMP |
| **Farbräume** | sRGB, Display P3, Adobe RGB, ProPhoto RGB, Rec. 2020 |

Positionen (Freistellungsrechtecke, Maskenpunkte, Reparaturstellen) sind **normalisiert 0..1 ab der linken oberen Ecke**. Motiv- / Himmel- / Hintergrundmasken nutzen die klassischen Heuristiken von LightCraft 0.4 (kein KI-Modell nötig).

## Beispiel

```json
{
  "input_dir": "D:\\Fotos\\Reise",
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
  "watermark": "© Mein Name",
  "output_dir": "D:\\Fotos\\Reise\\export"
}
```

## Voraussetzungen

- **LightCraft** mit `lightcraft-cli` (getestet mit **0.4.0**); siehe [Plattformen](#plattformen)
- Node.js ≥ 20 (bei `.mcpb`-Installationen in Claude Desktop enthalten)

## Installation

### Claude Desktop (empfohlen, alle Plattformen)

1. Laden Sie `lightcraft-mcp-server.mcpb` aus dem [neuesten Release](https://github.com/jhonsu01/lightcraft-mcp-server/releases/latest) herunter.
2. Doppelklicken (oder in Claude Desktop → *Einstellungen → Erweiterungen* ziehen) und auf **Installieren** klicken.
3. Optional: Liegt LightCraft nicht am Standardort, tragen Sie seinen Ordner oder den Pfad von `lightcraft-cli` in den Einstellungen der Erweiterung ein.

### Claude Code / andere MCP-Clients

```bash
git clone https://github.com/jhonsu01/lightcraft-mcp-server.git
cd lightcraft-mcp-server
npm install
npm run build
```

Windows:

```bash
claude mcp add lightcraft -- node "%CD%\dist\bundle.cjs"
```

macOS / Linux:

```bash
claude mcp add lightcraft -- node "$PWD/dist/bundle.cjs"
```

## Konfiguration

| Variable | Bedeutung |
| --- | --- |
| `LIGHTCRAFT_DIR` | LightCraft-Ordner, eine seiner Programmdateien, die Wurzel eines `.tar.gz` (mit `bin/`) oder `LightCraft.app`. Standard: automatische Erkennung |
| `LIGHTCRAFT_CLI` | Pfad zu `lightcraft-cli` / `lightcraft-cli.exe` (hat Vorrang vor `LIGHTCRAFT_DIR`) |
| `LIGHTCRAFT_APP` | Pfad der Desktop-App, wenn sie woanders liegt (z. B. ein AppImage unter Linux) |
| `LIGHTCRAFT_CONTROL_PORT` | Steuerport der Desktop-App (Standard 7980) |
| `LIGHTCRAFT_MCP_TIMEOUT` | Maximale Sekunden pro Engine-Aufruf (Standard 3600) |

## Sicherheit

- Dateien werden **nie überschrieben**, außer mit `overwrite: true`: In Ordnern wird ein freier Name (`_2`) verwendet, ein vorhandener `output_path` ist ein Fehler. Originale werden nur gelesen; daneben werden keine XMP-Dateien geschrieben.
- Alle Pfade müssen absolut sein. Die Engine läuft ohne Oberfläche mit einer Wegwerf-Bibliothek und berührt nie Ihre LightCraft-Bibliothek oder App, außer mit `live: true` (oder `open_in_lightcraft`, das die Fotos wie jeder Import in die Bibliothek der App aufnimmt).
- Alles läuft lokal ohne Netzwerkzugriff. Jede Aufgabe nutzt eine private Engine in einem temporären Ordner, der danach gelöscht wird.

## Entwicklung

```bash
npm run build       # TypeScript + Bundle in einer Datei (dist/bundle.cjs)
npm test            # Unit-Tests (Pfadlogik für Windows, macOS und Linux)
npm run test:e2e    # 23 End-to-End-Prüfungen über echtes MCP-stdio (synthetische Bilder und DNGs)
npm run pack:mcpb   # lightcraft-mcp-server.mcpb
```

Linux-Test in Docker (zuerst `lightcraft-<Version>-linux-x86_64.tar.gz` entpacken):

```bash
docker run --rm -v "$PWD:/work:ro" -v "/pfad/zu/lightcraft-0.4.0-linux-x86_64:/opt/lightcraft:ro" -w /work node:22-bookworm bash -c "apt-get update && apt-get install -y libxkbcommon0 libvulkan1 libegl1 mesa-vulkan-drivers libasound2 fontconfig && node scripts/e2e.mjs"
```

## Lizenz

Apache-2.0. LightCraft ist © seiner Autoren (Storytold), MIT oder Apache-2.0.
Dieses Projekt ist nicht mit LightCraft oder Storytold verbunden und wird von ihnen nicht unterstützt. Lightroom ist eine Marke von Adobe.
