import { readFileSync } from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerAdvancedTools } from './tools/advanced.js';
import { registerDevelopTools } from './tools/develop.js';

/** serverInfo.version comes from package.json (reachable as ../package.json from dist/ and src/). */
export function readPackageVersion(): string {
  try {
    const dir = path.dirname(fileURLToPath(import.meta.url));
    const pkg = JSON.parse(readFileSync(path.resolve(dir, '../package.json'), 'utf-8')) as { version?: unknown };
    if (typeof pkg.version === 'string' && pkg.version) return pkg.version;
  } catch {
    // package.json not shipped next to the bundle: still start
  }
  return '0.0.0-unknown';
}

export function createServer(): McpServer {
  const server = new McpServer(
    { name: 'lightcraft-mcp-server', version: readPackageVersion() },
    {
      instructions:
        'Develops photos and raw files with the engine of the locally installed LightCraft (Windows, macOS, Linux), an open-source ' +
        'Lightroom-class raw developer: auto tone, white balance, 114 develop sliders, presets and profiles (Lightroom .xmp presets too), ' +
        'black & white, crop and straighten, spot healing, masks with local adjustments, HDR and panorama merges, culling by sharpness, ' +
        'and export to JPEG, PNG, TIFF, WebP, AVIF and DNG, for one photo or whole folders. Positions (crop rects, mask points, spots) ' +
        'are normalized 0..1 from the top-left. All paths must be absolute; originals are only read; files are never overwritten ' +
        'unless overwrite is true. The engine runs headless with a throwaway library and never touches the LightCraft app or its ' +
        'library unless live=true. list_lightcraft_catalog lists the controls, presets, profiles and 240 commands.',
    },
  );
  registerDevelopTools(server);
  registerAdvancedTools(server);
  return server;
}
