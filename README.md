<p align="center"><img src="icon.png" width="120" alt="LightCraft Bridge icon"></p>

<h1 align="center">LightCraft MCP Server</h1>

<p align="center">
  <b>English</b> · <a href="README.es.md">Español</a> · <a href="README.pt-BR.md">Português</a> · <a href="README.fr.md">Français</a> · <a href="README.de.md">Deutsch</a> · <a href="README.ru.md">Русский</a> · <a href="README.zh-CN.md">简体中文</a> · <a href="README.ja.md">日本語</a> · <a href="README.ko.md">한국어</a>
</p>

<p align="center">
  Let Claude develop your photos and raw files with the <b>LightCraft</b> installed on your computer — <b>Windows, macOS and Linux</b>:<br>
  auto tone, white balance, presets, masks, spot healing, HDR and panoramas, culling, and export to JPEG, TIFF, WebP, AVIF and DNG.
</p>

---

## Why

[LightCraft](https://github.com/storytold/lightcraft) is an open-source, Lightroom-class photo library and raw developer written in Rust, with a headless CLI (`lightcraft-cli`), 240 commands, 114 develop controls and an MCP mode. This [Model Context Protocol](https://modelcontextprotocol.io) server turns that engine into **file-in / file-out tools** for Claude, so you can ask things like:

> *"Develop every raw in `D:\Wedding\ceremony` with auto tone, daylight white balance and +15 clarity, and export JPEGs at 2048 px with my watermark."*
> *"Apply my Lightroom preset `Moody.xmp` to these photos and save them as 16-bit TIFF in Adobe RGB."*
> *"Darken the sky of `lake.dng` with a graduated filter and brighten the subject with a radial mask."*
> *"Merge these 3 brackets into an HDR DNG, and stitch this folder into a panorama."*
> *"From this burst, keep only the sharpest photos and copy them to `D:\Selects`."*

Sibling of [photocraft-mcp-server](https://github.com/jhonsu01/photocraft-mcp-server), [vectorcraft-mcp-server](https://github.com/jhonsu01/vectorcraft-mcp-server), [filmcraft-mcp-server](https://github.com/jhonsu01/filmcraft-mcp-server), [pdfcraft-mcp-server](https://github.com/jhonsu01/pdfcraft-mcp-server) and [audacity-mcp-server](https://github.com/jhonsu01/audacity-mcp-server).

## Platforms

| OS | LightCraft package to install | Where the server finds it (no setup needed) | Status |
| --- | --- | --- | --- |
| **Windows** 10/11 (x64, x86, arm64) | MSI or portable zip | `C:\Program Files\LightCraft`, `%LOCALAPPDATA%\Programs\LightCraft`, `PATH` | ✅ Verified (Windows 11) |
| **Linux** (x86_64, aarch64) | `.deb`, `.rpm` or `.tar.gz` | `/usr/bin`, `/usr/local/bin`, `/opt/lightcraft/bin`, `~/.local/bin`, `PATH` | ✅ Verified (Debian 12, headless) |
| **macOS** 11+ (Apple silicon and Intel) | `.dmg` (the app) **plus** `lightcraft-cli-<version>-macos-universal.zip` | `/Applications/LightCraft.app`, `/usr/local/bin`, `/opt/homebrew/bin`, `~/.local/bin`, `~/bin`, `PATH` | 🟡 Supported, not yet tested on a Mac |

All downloads: [LightCraft releases](https://github.com/storytold/lightcraft/releases) (there is also a FreeBSD tar.gz; set `LIGHTCRAFT_DIR` to it). Anywhere else: set `LIGHTCRAFT_DIR` (folder, `.tar.gz` root or `LightCraft.app`) or `LIGHTCRAFT_CLI`.

- **macOS:** the DMG contains only the app. Unzip the separate `lightcraft-cli` zip and move `lightcraft-cli` to `/usr/local/bin` (or point `LIGHTCRAFT_CLI` at it). The first run checks Apple's notarization online.
- **Linux:** the AppImage and Flatpak contain only the app, not `lightcraft-cli`; use the deb, rpm or tar.gz. For an AppImage app, set `LIGHTCRAFT_APP` so `open_in_lightcraft` can start it. On a server without a GPU, the verified setup used `libxkbcommon0 libvulkan1 libegl1 mesa-vulkan-drivers libasound2 fontconfig`.

## How it works

| Part | What it is |
| --- | --- |
| **LightCraft engine** (`lightcraft-cli mcp`) | LightCraft's own engine: raw decoders, develop pipeline, masks, healing, Photo Merge and exporters. Started fresh and **headless** for each job with a **throwaway library**, so it never touches your LightCraft library or an open LightCraft window. |
| **MCP server** (Node.js) | 10 high-level tools. Imports your photos by reference (they are only read; no XMP sidecars are written), applies the edits, and exports where you asked. Merges run on private copies, so nothing appears next to your originals. It validates paths and never overwrites. |
| **Live app** (optional) | `open_in_lightcraft control=true` starts the app with its loopback-only control channel (port 7980) and `run_lightcraft_commands live=true` drives it and its library. |

## Tools

| Tool | What it does |
| --- | --- |
| `develop_photos` | Auto tone, white balance (presets, Kelvin, eyedropper), any of the 114 sliders, presets (also Lightroom `.xmp` / `.lrtemplate`) and profiles, black & white, tone curve, crop / aspect / straighten / upright, rotate / flip, spot healing, dust and red-eye removal, masks (graduated, radial, luminance, colour, brush, subject, sky, background) with local adjustments, any engine command; one photo, a list or a folder; exports with size, quality, file-size limit, colour space, bit depth, sharpening, metadata policy and watermark |
| `convert_photos` | Raw and photos to JPEG, PNG, TIFF, WebP, AVIF or DNG as they are, resized, in batches |
| `render_preview` | A photo as Claude sees it, optionally with a trial look (nothing written unless asked) |
| `get_photo_info` | Camera, lens, exposure, capture time, GPS, size, raw or not, and every EXIF / XMP tag |
| `merge_photos` | HDR from brackets, panorama, HDR panorama — as an editable DNG and optionally developed JPEG / TIFF |
| `analyze_photos` | Culling: focus (sharpness) and clipping scores, bursts grouped, the sharpest of each copied to a folder |
| `list_lightcraft_catalog` | Develop controls with ranges, presets, profiles, curve presets, export presets, 240 commands, formats |
| `run_lightcraft_commands` | Any engine commands in one session (`$steps[N].field` references), headless or in the live app |
| `open_in_lightcraft` | Open photos in the LightCraft app (optionally with the control channel) |
| `get_lightcraft_status` | Platform, installation, version, commands, controls, app / control port |

| | |
| --- | --- |
| **Reads** | Raw: DNG, CR2, CR3, ARW, NEF, RAF (Bayer and X-Trans), RW2 / RWL, PEF, ORF, SRW · JPEG, PNG, TIFF, WebP, PSD composites, JPEG XL |
| **Writes** | JPEG, PNG (8/16-bit), TIFF (8/16/32-bit), WebP, AVIF (8/10-bit), DNG (raw inputs, edits embedded), original + XMP sidecar |
| **Colour spaces** | sRGB, Display P3, Adobe RGB, ProPhoto RGB, Rec. 2020 |

Positions (crop rectangles, mask points, spots) are **normalized 0..1 from the top-left corner**. Subject / sky / background masks use LightCraft 0.4's classical heuristics (no AI model needed).

## Example

```json
{
  "input_dir": "D:\\Photos\\Trip",
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
  "watermark": "© My Name",
  "output_dir": "D:\\Photos\\Trip\\export"
}
```

## Requirements

- **LightCraft** with `lightcraft-cli` (tested with **0.4.0**); see [Platforms](#platforms)
- Node.js ≥ 20 (bundled with Claude Desktop for `.mcpb` installs)

## Installation

### Claude Desktop (recommended, all platforms)

1. Download `lightcraft-mcp-server.mcpb` from the [latest release](https://github.com/jhonsu01/lightcraft-mcp-server/releases/latest).
2. Double-click it (or drag it into Claude Desktop → *Settings → Extensions*) and click **Install**.
3. Optional: if LightCraft is not in a standard location, fill in its folder or the `lightcraft-cli` path in the extension settings.

### Codex (OpenAI)

**Recommended — the marketplace (gets updates):** *Plugins → Add → Add marketplace*, source `jhonsu01/craft-marketplace`, reference `main`, then install **LightCraft Bridge** from **Craft Bridges** ([craft-marketplace](https://github.com/jhonsu01/craft-marketplace)). New versions arrive by refreshing the marketplace. Or upload the zip (Codex then keeps it in your account and refuses a newer zip with the same name):

1. Download `lightcraft-mcp-server-<version>-codex.zip` from the [latest release](https://github.com/jhonsu01/lightcraft-mcp-server/releases/latest).
2. In Codex: *Plugins → Add → New plugin*, choose the zip and click **Add plugin**.
3. Codex starts the server with `node`, so Node.js ≥ 20 must be on `PATH`. If LightCraft is not in a standard location, set `LIGHTCRAFT_DIR` or `LIGHTCRAFT_CLI` as system environment variables (Codex has no settings form for local plugins).

### DeepSeek Harness

1. *Plugins → Add plugin*, enter `github:jhonsu01/craft-marketplace#path:/plugins/lightcraft-mcp-server` and click **Install**, then **Enable now**.
2. Harness runs the server with its own MCP client and `node` (Node.js ≥ 20 on `PATH`); the tools appear as `mcp__lightcraft__<tool>` and the output files as cards that open in Harness.
3. Harness does not update plugins by itself yet: to upgrade, uninstall the plugin and install it again with the same address.

### Claude Code / other MCP clients

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

## Configuration

| Variable | Meaning |
| --- | --- |
| `LIGHTCRAFT_DIR` | LightCraft folder, one of its executables, a `.tar.gz` root (with `bin/`) or `LightCraft.app`. Default: auto-detect |
| `LIGHTCRAFT_CLI` | Path of `lightcraft-cli` / `lightcraft-cli.exe` (wins over `LIGHTCRAFT_DIR`) |
| `LIGHTCRAFT_APP` | Path of the desktop app when it lives elsewhere (e.g. a Linux AppImage) |
| `LIGHTCRAFT_CONTROL_PORT` | Control port of the desktop app (default 7980) |
| `LIGHTCRAFT_MCP_TIMEOUT` | Maximum seconds per engine call (default 3600) |

## Safety

- Files are **never overwritten** unless `overwrite: true`: a free name (`_2`) is used in folders and an existing `output_path` is an error. Originals are only read; no sidecars are written next to them.
- All paths must be absolute. The engine runs headless with a throwaway library and never touches your LightCraft library or app unless `live: true` (or `open_in_lightcraft`, which imports the photos into the app's library like any import).
- Everything runs locally with no network access. Each job uses a private engine in a temporary folder that is deleted at the end.

## Development

```bash
npm run build       # TypeScript + single-file bundle (dist/bundle.cjs)
npm test            # unit tests (Windows, macOS and Linux path logic)
npm run test:e2e    # 24 end-to-end checks over real MCP stdio (synthetic images and DNGs)
npm run pack:mcpb   # lightcraft-mcp-server.mcpb
npm run pack:codex  # Codex plugin zip
```

Linux test in Docker (unpack `lightcraft-<version>-linux-x86_64.tar.gz` first):

```bash
docker run --rm -v "$PWD:/work:ro" -v "/path/to/lightcraft-0.4.0-linux-x86_64:/opt/lightcraft:ro" -w /work node:22-bookworm bash -c "apt-get update && apt-get install -y libxkbcommon0 libvulkan1 libegl1 mesa-vulkan-drivers libasound2 fontconfig && node scripts/e2e.mjs"
```

## License

Apache-2.0. LightCraft is © its authors (Storytold), MIT or Apache-2.0.
This project is not affiliated with or endorsed by LightCraft or Storytold. Lightroom is a trademark of Adobe.
