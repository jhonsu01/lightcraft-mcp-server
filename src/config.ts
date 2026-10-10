import { existsSync } from 'fs';
import * as os from 'os';
import * as path from 'path';

/**
 * An unfilled MCPB user_config placeholder ("${user_config.x}") reaches the process
 * literally when the user left the field empty, so treat it as unset.
 */
export function cleanEnv(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const v = value.trim().replace(/^"(.*)"$/, '$1');
  if (!v || v.includes('${')) return undefined;
  return v;
}

export type Platform = 'win32' | 'darwin' | 'linux';

export function currentPlatform(): Platform {
  return process.platform === 'win32' || process.platform === 'darwin' ? process.platform : 'linux';
}

/** Path helpers of the given platform (lets the tests check every OS from any OS). */
export function pathFor(platform: Platform): path.PlatformPath {
  return platform === 'win32' ? path.win32 : path.posix;
}

export interface LightCraftInstall {
  platform: Platform;
  /** Where we looked first (LIGHTCRAFT_DIR or the platform default). */
  dir: string;
  cli: string | undefined;
  app: string | undefined;
  searched: string[];
}

/** Executable names of the headless CLI and the desktop app. */
export function exeNames(platform: Platform): { cli: string; app: string[] } {
  if (platform === 'win32') return { cli: 'lightcraft-cli.exe', app: ['lightcraft.exe'] };
  // macOS: the app binary inside LightCraft.app is "LightCraft"; Linux packages install "lightcraft"
  return { cli: 'lightcraft-cli', app: platform === 'darwin' ? ['LightCraft', 'lightcraft'] : ['lightcraft'] };
}

/** Folders LightCraft installs into on each OS (the official MSI, DMG, deb/rpm and tar.gz layouts). */
export function defaultDirs(platform: Platform, env: NodeJS.ProcessEnv, home = os.homedir()): string[] {
  const p = pathFor(platform);
  if (platform === 'win32') {
    const local = env['LOCALAPPDATA'] || p.join(home, 'AppData', 'Local');
    return [
      p.join(env['ProgramFiles'] || 'C:\\Program Files', 'LightCraft'),
      p.join(env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'LightCraft'),
      p.join(local, 'Programs', 'LightCraft'),
    ];
  }
  if (platform === 'darwin') {
    return [
      '/Applications/LightCraft.app/Contents/MacOS',
      p.join(home, 'Applications', 'LightCraft.app', 'Contents', 'MacOS'),
      '/usr/local/bin',
      '/opt/homebrew/bin',
      p.join(home, '.local', 'bin'),
      p.join(home, 'bin'),
    ];
  }
  return ['/usr/bin', '/usr/local/bin', '/opt/lightcraft/bin', '/opt/lightcraft', p.join(home, '.local', 'bin'), p.join(home, 'bin')];
}

/**
 * Find lightcraft-cli and the desktop app.
 *  - LIGHTCRAFT_CLI: the CLI executable itself (wins).
 *  - LIGHTCRAFT_DIR: install folder, one of its executables, a tar.gz root (with bin/) or LightCraft.app.
 *  - LIGHTCRAFT_APP: the desktop app executable (e.g. an AppImage) when it lives elsewhere.
 *  - otherwise the platform's default folders, then PATH.
 */
export function resolveInstall(
  env: NodeJS.ProcessEnv = process.env,
  exists: (p: string) => boolean = existsSync,
  platform: Platform = currentPlatform(),
  home = os.homedir(),
): LightCraftInstall {
  const p = pathFor(platform);
  const names = exeNames(platform);
  const dirs: string[] = [];
  const fromEnv = cleanEnv(env['LIGHTCRAFT_DIR']);
  if (fromEnv) {
    let d = fromEnv;
    if (/\.app\/?$/i.test(d)) d = p.join(d, 'Contents', 'MacOS');
    else if (/\.(exe|appimage)$/i.test(d) || /(^|[\\/])(lightcraft|lightcraft-cli|LightCraft)$/.test(d)) d = p.dirname(d);
    dirs.push(d, p.join(d, 'bin'));
  }
  dirs.push(...defaultDirs(platform, env, home));
  const sep = platform === 'win32' ? ';' : ':';
  for (const d of (env['PATH'] || env['Path'] || '').split(sep)) if (d) dirs.push(d.replace(/"/g, ''));
  const searched = [...new Set(dirs)];

  const cliEnv = cleanEnv(env['LIGHTCRAFT_CLI']);
  const cli = [cliEnv, ...searched.map((d) => p.join(d, names.cli))].filter((x): x is string => !!x).find((x) => exists(x));

  const appEnv = cleanEnv(env['LIGHTCRAFT_APP']);
  const appDirs = [...(cli ? [p.dirname(cli)] : []), ...searched];
  if (platform === 'darwin') appDirs.unshift('/Applications/LightCraft.app/Contents/MacOS', p.join(home, 'Applications', 'LightCraft.app', 'Contents', 'MacOS'));
  const app = [appEnv, ...appDirs.flatMap((d) => names.app.map((n) => p.join(d, n)))]
    .filter((x): x is string => !!x)
    .find((x) => exists(x));

  return { platform, dir: searched[0], cli, app, searched };
}

/** Positive integer from an env var, otherwise the default. */
export function resolveInt(envValue: string | undefined, def: number, max = 86400): number {
  if (!envValue || !/^\d+$/.test(envValue.trim())) return def;
  const n = Number(envValue.trim());
  return n > 0 && n <= max ? n : def;
}

/** Longest single engine call (big raw batches, HDR and panorama merges can take a while). */
export const COMMAND_TIMEOUT_SEC = resolveInt(process.env['LIGHTCRAFT_MCP_TIMEOUT'], 3600);

/** Control port of the live LightCraft app (`lightcraft --control PORT`). */
export const CONTROL_PORT = resolveInt(cleanEnv(process.env['LIGHTCRAFT_CONTROL_PORT']), 7980, 65535);

/**
 * Folder of this connector's own files (the working folder the desktop app is started from):
 * %APPDATA%\lightcraft-mcp-server on Windows, ~/Library/Application Support/lightcraft-mcp-server on macOS,
 * $XDG_CONFIG_HOME (or ~/.config)/lightcraft-mcp-server on Linux.
 */
export function connectorDir(env: NodeJS.ProcessEnv = process.env, platform: Platform = currentPlatform(), home = os.homedir()): string {
  const p = pathFor(platform);
  if (platform === 'win32') return p.join(env['APPDATA'] || p.join(home, 'AppData', 'Roaming'), 'lightcraft-mcp-server');
  if (platform === 'darwin') return p.join(home, 'Library', 'Application Support', 'lightcraft-mcp-server');
  return p.join(env['XDG_CONFIG_HOME'] || p.join(home, '.config'), 'lightcraft-mcp-server');
}
