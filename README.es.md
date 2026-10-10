<p align="center"><img src="icon.png" width="120" alt="Icono de LightCraft Bridge"></p>

<h1 align="center">LightCraft MCP Server</h1>

<p align="center">
  <a href="README.md">English</a> · <b>Español</b> · <a href="README.pt-BR.md">Português</a> · <a href="README.fr.md">Français</a> · <a href="README.de.md">Deutsch</a> · <a href="README.ru.md">Русский</a> · <a href="README.zh-CN.md">简体中文</a> · <a href="README.ja.md">日本語</a> · <a href="README.ko.md">한국어</a>
</p>

<p align="center">
  Deja que Claude revele tus fotos y archivos RAW con el <b>LightCraft</b> instalado en tu ordenador — <b>Windows, macOS y Linux</b>:<br>
  tono automático, balance de blancos, ajustes preestablecidos, máscaras, corrección de manchas, HDR y panorámicas, selección y exportación a JPEG, TIFF, WebP, AVIF y DNG.
</p>

---

## Por qué

[LightCraft](https://github.com/storytold/lightcraft) es una fototeca y revelador RAW de código abierto, al nivel de Lightroom, escrito en Rust, con una CLI sin interfaz (`lightcraft-cli`), 240 comandos, 114 controles de revelado y un modo MCP. Este servidor [Model Context Protocol](https://modelcontextprotocol.io) convierte ese motor en **herramientas de archivo a archivo** para Claude, para pedir cosas como:

> *"Revela todos los RAW de `D:\Boda\ceremonia` con tono automático, balance de luz de día y +15 de claridad, y exporta JPEG a 2048 px con mi marca de agua."*
> *"Aplica mi ajuste de Lightroom `Moody.xmp` a estas fotos y guárdalas como TIFF de 16 bits en Adobe RGB."*
> *"Oscurece el cielo de `lago.dng` con un filtro graduado e ilumina al sujeto con una máscara radial."*
> *"Une estos 3 horquillados en un DNG HDR, y monta esta carpeta como panorámica."*
> *"De esta ráfaga, quédate solo con las fotos más nítidas y cópialas a `D:\Selección`."*

Hermano de [photocraft-mcp-server](https://github.com/jhonsu01/photocraft-mcp-server), [vectorcraft-mcp-server](https://github.com/jhonsu01/vectorcraft-mcp-server), [filmcraft-mcp-server](https://github.com/jhonsu01/filmcraft-mcp-server), [pdfcraft-mcp-server](https://github.com/jhonsu01/pdfcraft-mcp-server) y [audacity-mcp-server](https://github.com/jhonsu01/audacity-mcp-server).

## Plataformas

| Sistema | Paquete de LightCraft a instalar | Dónde lo encuentra el servidor (sin configurar) | Estado |
| --- | --- | --- | --- |
| **Windows** 10/11 (x64, x86, arm64) | MSI o zip portátil | `C:\Program Files\LightCraft`, `%LOCALAPPDATA%\Programs\LightCraft`, `PATH` | ✅ Verificado (Windows 11) |
| **Linux** (x86_64, aarch64) | `.deb`, `.rpm` o `.tar.gz` | `/usr/bin`, `/usr/local/bin`, `/opt/lightcraft/bin`, `~/.local/bin`, `PATH` | ✅ Verificado (Debian 12, sin interfaz) |
| **macOS** 11+ (Apple silicon e Intel) | `.dmg` (la app) **más** `lightcraft-cli-<versión>-macos-universal.zip` | `/Applications/LightCraft.app`, `/usr/local/bin`, `/opt/homebrew/bin`, `~/.local/bin`, `~/bin`, `PATH` | 🟡 Soportado, aún sin probar en un Mac |

Descargas: [versiones de LightCraft](https://github.com/storytold/lightcraft/releases) (hay también un tar.gz para FreeBSD; apunta `LIGHTCRAFT_DIR` a él). En cualquier otro sitio: define `LIGHTCRAFT_DIR` (carpeta, raíz del `.tar.gz` o `LightCraft.app`) o `LIGHTCRAFT_CLI`.

- **macOS:** el DMG solo trae la app. Descomprime el zip aparte de `lightcraft-cli` y mueve `lightcraft-cli` a `/usr/local/bin` (o apunta `LIGHTCRAFT_CLI` a él). La primera ejecución comprueba en línea la notarización de Apple.
- **Linux:** el AppImage y el Flatpak solo traen la app, sin `lightcraft-cli`; usa el deb, el rpm o el tar.gz. Si la app es un AppImage, define `LIGHTCRAFT_APP` para que `open_in_lightcraft` pueda abrirla. En un servidor sin GPU, la configuración verificada usó `libxkbcommon0 libvulkan1 libegl1 mesa-vulkan-drivers libasound2 fontconfig`.

## Cómo funciona

| Parte | Qué es |
| --- | --- |
| **Motor de LightCraft** (`lightcraft-cli mcp`) | El propio motor de LightCraft: decodificadores RAW, revelado, máscaras, corrección, Fusión de fotos y exportadores. Se inicia de cero y **sin interfaz** en cada tarea con una **fototeca desechable**, así que nunca toca tu fototeca de LightCraft ni una ventana abierta. |
| **Servidor MCP** (Node.js) | 10 herramientas de alto nivel. Importa tus fotos por referencia (solo se leen; no se escriben archivos XMP junto a ellas), aplica los ajustes y exporta donde pediste. Las fusiones trabajan sobre copias privadas, así que nada aparece junto a tus originales. Valida rutas y nunca sobrescribe. |
| **App en vivo** (opcional) | `open_in_lightcraft control=true` abre la app con su canal de control solo local (puerto 7980) y `run_lightcraft_commands live=true` la controla junto con su fototeca. |

## Herramientas

| Herramienta | Qué hace |
| --- | --- |
| `develop_photos` | Tono automático, balance de blancos (preajustes, Kelvin, cuentagotas), cualquiera de los 114 controles, ajustes preestablecidos (también `.xmp` / `.lrtemplate` de Lightroom) y perfiles, blanco y negro, curva de tonos, recorte / proporción / enderezar / vertical, rotar / voltear, corrección de manchas, eliminación de polvo y ojos rojos, máscaras (graduada, radial, luminancia, color, pincel, sujeto, cielo, fondo) con ajustes locales, cualquier comando del motor; una foto, una lista o una carpeta; exporta con tamaño, calidad, límite de peso, espacio de color, profundidad de bits, enfoque, metadatos y marca de agua |
| `convert_photos` | RAW y fotos a JPEG, PNG, TIFF, WebP, AVIF o DNG tal cual, redimensionadas, por lotes |
| `render_preview` | Una foto como la ve Claude, opcionalmente con un ajuste de prueba (no escribe nada salvo que se pida) |
| `get_photo_info` | Cámara, objetivo, exposición, fecha de captura, GPS, tamaño, si es RAW, y cada etiqueta EXIF / XMP |
| `merge_photos` | HDR de horquillados, panorámica, panorámica HDR — como DNG editable y opcionalmente JPEG / TIFF revelado |
| `analyze_photos` | Selección: puntuación de nitidez y recorte de luces/sombras, ráfagas agrupadas y la más nítida de cada una copiada a una carpeta |
| `list_lightcraft_catalog` | Controles de revelado con rangos, ajustes preestablecidos, perfiles, curvas, ajustes de exportación, 240 comandos, formatos |
| `run_lightcraft_commands` | Cualquier comando del motor en una sesión (referencias `$steps[N].campo`), sin interfaz o en la app en vivo |
| `open_in_lightcraft` | Abre fotos en la app LightCraft (opcionalmente con el canal de control) |
| `get_lightcraft_status` | Plataforma, instalación, versión, comandos, controles, app / puerto de control |

| | |
| --- | --- |
| **Lee** | RAW: DNG, CR2, CR3, ARW, NEF, RAF (Bayer y X-Trans), RW2 / RWL, PEF, ORF, SRW · JPEG, PNG, TIFF, WebP, PSD (compuesto), JPEG XL |
| **Escribe** | JPEG, PNG (8/16 bits), TIFF (8/16/32 bits), WebP, AVIF (8/10 bits), DNG (entradas RAW, ajustes incluidos), original + XMP |
| **Espacios de color** | sRGB, Display P3, Adobe RGB, ProPhoto RGB, Rec. 2020 |

Las posiciones (rectángulos de recorte, puntos de máscara, manchas) son **normalizadas 0..1 desde la esquina superior izquierda**. Las máscaras de sujeto / cielo / fondo usan las heurísticas clásicas de LightCraft 0.4 (no necesitan modelo de IA).

## Ejemplo

```json
{
  "input_dir": "D:\\Fotos\\Viaje",
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
  "watermark": "© Mi Nombre",
  "output_dir": "D:\\Fotos\\Viaje\\export"
}
```

## Requisitos

- **LightCraft** con `lightcraft-cli` (probado con **0.4.0**); ver [Plataformas](#plataformas)
- Node.js ≥ 20 (incluido en Claude Desktop para instalaciones `.mcpb`)

## Instalación

### Claude Desktop (recomendado, todas las plataformas)

1. Descarga `lightcraft-mcp-server.mcpb` de la [última versión](https://github.com/jhonsu01/lightcraft-mcp-server/releases/latest).
2. Haz doble clic (o arrástralo a Claude Desktop → *Configuración → Extensiones*) y pulsa **Instalar**.
3. Opcional: si LightCraft no está en una ubicación estándar, indica su carpeta o la ruta de `lightcraft-cli` en la configuración de la extensión.

### Claude Code / otros clientes MCP

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

## Configuración

| Variable | Significado |
| --- | --- |
| `LIGHTCRAFT_DIR` | Carpeta de LightCraft, uno de sus ejecutables, la raíz de un `.tar.gz` (con `bin/`) o `LightCraft.app`. Por defecto: detección automática |
| `LIGHTCRAFT_CLI` | Ruta de `lightcraft-cli` / `lightcraft-cli.exe` (tiene prioridad sobre `LIGHTCRAFT_DIR`) |
| `LIGHTCRAFT_APP` | Ruta de la app de escritorio cuando está en otro sitio (p. ej. un AppImage en Linux) |
| `LIGHTCRAFT_CONTROL_PORT` | Puerto de control de la app de escritorio (por defecto 7980) |
| `LIGHTCRAFT_MCP_TIMEOUT` | Máximo de segundos por llamada al motor (por defecto 3600) |

## Seguridad

- Los archivos **nunca se sobrescriben** salvo con `overwrite: true`: en una carpeta se usa un nombre libre (`_2`) y un `output_path` existente da error. Los originales solo se leen; no se escriben archivos XMP junto a ellos.
- Todas las rutas deben ser absolutas. El motor funciona sin interfaz con una fototeca desechable y nunca toca tu fototeca ni la app de LightCraft salvo con `live: true` (o `open_in_lightcraft`, que importa las fotos a la fototeca de la app como cualquier importación).
- Todo se ejecuta en local, sin acceso a la red. Cada tarea usa un motor privado en una carpeta temporal que se borra al final.

## Desarrollo

```bash
npm run build       # TypeScript + bundle de un solo archivo (dist/bundle.cjs)
npm test            # pruebas unitarias (lógica de rutas de Windows, macOS y Linux)
npm run test:e2e    # 23 pruebas de extremo a extremo por MCP stdio real (imágenes y DNG sintéticos)
npm run pack:mcpb   # lightcraft-mcp-server.mcpb
```

Prueba de Linux en Docker (descomprime antes `lightcraft-<versión>-linux-x86_64.tar.gz`):

```bash
docker run --rm -v "$PWD:/work:ro" -v "/ruta/a/lightcraft-0.4.0-linux-x86_64:/opt/lightcraft:ro" -w /work node:22-bookworm bash -c "apt-get update && apt-get install -y libxkbcommon0 libvulkan1 libegl1 mesa-vulkan-drivers libasound2 fontconfig && node scripts/e2e.mjs"
```

## Licencia

Apache-2.0. LightCraft es © de sus autores (Storytold), MIT o Apache-2.0.
Este proyecto no está afiliado ni respaldado por LightCraft ni por Storytold. Lightroom es una marca de Adobe.
