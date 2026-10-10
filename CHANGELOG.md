# Changelog

## [1.0.1] - 2026-10-10
### Added
- Codex (OpenAI) plugin: each release also ships `lightcraft-mcp-server-<version>-codex.zip` with
  `.codex-plugin/plugin.json` and `.mcp.json` (a local stdio server, `node ./dist/bundle.cjs`), built by
  `npm run pack:codex` from the same bundle and manifest as the `.mcpb`. The plugin is also listed in the
  [Craft Bridges](https://github.com/jhonsu01/craft-marketplace) Codex marketplace, which delivers updates.
### Fixed
- Claude Desktop settings: the LightCraft folder hint shows `C:\Program Files\LightCraft` (the backslashes were missing).
### Verified
- No changes to the tools. Windows 11 and Debian 12 (Docker): all end-to-end checks pass; the `.mcpb` and the Codex
  plugin tested unpacked.

## [1.0.0] - 2026-10-09
### Added
- MCP server on LightCraft's own engine (`lightcraft-cli mcp`): one private, headless engine per job with a throwaway
  in-memory library. Photos are imported by reference and only read (no XMP sidecars are written next to them);
  merges run on private copies, so nothing appears next to the originals.
- 10 tools: `develop_photos`, `convert_photos`, `render_preview`, `get_photo_info`, `merge_photos`, `analyze_photos`,
  `list_lightcraft_catalog`, `run_lightcraft_commands`, `open_in_lightcraft`, `get_lightcraft_status`.
- One edit block shared by `develop_photos`, `render_preview` and `merge_photos`: auto tone, white balance (presets,
  Kelvin, eyedropper), any of the 114 develop sliders, presets and profiles, preset files (.xmp, .lrtemplate, .lcpreset,
  imported once per batch), black & white, tone curve and curve presets, crop / aspect / straighten / upright,
  rotate / flip, spot healing, dust and red-eye removal, masks (graduated, radial, luminance, colour, brush, subject,
  sky, background) with local adjustments, and any engine command.
- Export options: JPEG, PNG, TIFF, WebP, AVIF, DNG and original + XMP; full size unless a size is given (the engine's
  own default is 3000 px), quality, file-size limit, colour space, bit depth, output sharpening, metadata policy,
  GPS removal and text watermarks (opacity in %).
- HDR, panorama and HDR panorama merges as editable DNG plus developed copies; culling by sharpness and clipping with
  the best of each burst copied to a folder.
- Live app: `open_in_lightcraft control=true` starts LightCraft with its loopback-only control channel (port 7980) and
  waits until it listens; `run_lightcraft_commands live=true` drives it.
- Never overwrites: a free `_2` name in folders, an error for an existing `output_path` unless `overwrite: true`
  (LightCraft's own export would replace files silently).
- Windows, macOS and Linux install detection (MSI, portable zip, DMG + CLI zip, deb, rpm, tar.gz, AppImage via
  `LIGHTCRAFT_APP`, PATH). README in 9 languages.
### Verified
- Windows 11 and Debian 12 (Docker, headless): 23/23 end-to-end checks each, with synthetic images and DNGs.
- Live mode on Windows 11 (app started with `--memory`): auto tone, clarity and rating applied in the app, then exported.
