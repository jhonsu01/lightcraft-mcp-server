import { mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { cleanEnv, connectorDir, resolveInstall, resolveInt } from '../../src/config.js';
import { resolveOutputPath, sameFile } from '../../src/paths.js';
import { substitute } from '../../src/tools/advanced.js';
import { collectInputs, engineExportOptions, formatOfPath, isRaw } from '../../src/tools/common.js';
import { editsOf, hasEdits, maskSchema } from '../../src/tools/develop.js';

describe('config', () => {
  it('treats unfilled MCPB placeholders as unset', () => {
    expect(cleanEnv('${user_config.lightcraft_dir}')).toBeUndefined();
    expect(resolveInt('${user_config.control_port}', 7980, 65535)).toBe(7980);
  });
  it('Windows: install folder, an .exe inside it, or nothing', () => {
    const exists = (p: string) => /^D:\\LC\\lightcraft(-cli)?\.exe$/i.test(p);
    const r = resolveInstall({ LIGHTCRAFT_DIR: 'D:\\LC' }, exists, 'win32', 'C:\\Users\\u');
    expect([r.cli, r.app]).toEqual(['D:\\LC\\lightcraft-cli.exe', 'D:\\LC\\lightcraft.exe']);
    expect(resolveInstall({ LIGHTCRAFT_DIR: 'D:\\LC\\lightcraft.exe' }, exists, 'win32').cli).toBe('D:\\LC\\lightcraft-cli.exe');
    const pf = (p: string) => p === 'C:\\Program Files\\LightCraft\\lightcraft-cli.exe';
    expect(resolveInstall({ ProgramFiles: 'C:\\Program Files' }, pf, 'win32').cli).toBe('C:\\Program Files\\LightCraft\\lightcraft-cli.exe');
  });
  it('Linux: deb/rpm, tar.gz root, PATH, AppImage app', () => {
    const deb = new Set(['/usr/bin/lightcraft-cli', '/usr/bin/lightcraft']);
    expect(Object.values(resolveInstall({}, (p) => deb.has(p), 'linux', '/home/u')).slice(2, 4)).toEqual(['/usr/bin/lightcraft-cli', '/usr/bin/lightcraft']);
    const tar = new Set(['/opt/x/lightcraft-0.4.0-linux-x86_64/bin/lightcraft-cli']);
    expect(resolveInstall({ LIGHTCRAFT_DIR: '/opt/x/lightcraft-0.4.0-linux-x86_64' }, (p) => tar.has(p), 'linux', '/home/u').cli).toBe('/opt/x/lightcraft-0.4.0-linux-x86_64/bin/lightcraft-cli');
    const onPath = new Set(['/srv/lightcraft-cli']);
    expect(resolveInstall({ PATH: '/usr/sbin:/srv' }, (p) => onPath.has(p), 'linux', '/home/u').cli).toBe('/srv/lightcraft-cli');
    const img = '/home/u/lightcraft-0.4.0-linux-x86_64.AppImage';
    expect(resolveInstall({ LIGHTCRAFT_APP: img }, (p) => p === img, 'linux', '/home/u').app).toBe(img);
  });
  it('macOS: LightCraft.app plus the separate CLI zip', () => {
    const files = new Set(['/Applications/LightCraft.app/Contents/MacOS/LightCraft', '/usr/local/bin/lightcraft-cli']);
    const r = resolveInstall({}, (p) => files.has(p), 'darwin', '/Users/u');
    expect([r.cli, r.app]).toEqual(['/usr/local/bin/lightcraft-cli', '/Applications/LightCraft.app/Contents/MacOS/LightCraft']);
  });
  it('keeps its own files in the per-user config folder', () => {
    expect(connectorDir({ APPDATA: 'C:\\Users\\u\\AppData\\Roaming' }, 'win32', 'C:\\Users\\u')).toBe('C:\\Users\\u\\AppData\\Roaming\\lightcraft-mcp-server');
    expect(connectorDir({}, 'linux', '/home/u')).toBe('/home/u/.config/lightcraft-mcp-server');
  });
});

describe('paths and formats', () => {
  it('never overwrites, POSIX case-sensitive', () => {
    const exists = (p: string) => p === 'D:\\a\\IMG_1.jpg';
    expect(resolveOutputPath({ inputPath: 'D:\\a\\IMG_1.CR3', ext: 'jpg', exists, platform: 'win32' })).toEqual({ path: 'D:\\a\\IMG_1_2.jpg' });
    expect(resolveOutputPath({ inputPath: '/a/x.nef', ext: 'jpg', outputPath: '/a/out.tif', platform: 'linux' })).toHaveProperty('error');
    expect(sameFile('/a/A.jpg', '/a/a.jpg', 'linux')).toBe(false);
  });
  it('maps extensions and recognises raws', () => {
    expect(formatOfPath('x.JPEG')).toBe('jpg');
    expect(formatOfPath('x.tif')).toBe('tiff');
    expect(formatOfPath('x.avif')).toBe('avif');
    expect(formatOfPath('x.cr3')).toBeUndefined();
    expect([isRaw('a.ARW'), isRaw('b.dng'), isRaw('c.jpg')]).toEqual([true, true, false]);
  });
  it('collects photos and raws from a folder', () => {
    const dir = mkdtempSync(join(tmpdir(), 'lc-unit-'));
    for (const f of ['b.NEF', 'a.jpg', 'c.xmp', 'd.txt', 'e.dng']) writeFileSync(join(dir, f), 'x');
    expect(collectInputs([], dir).map((p) => p.slice(dir.length + 1))).toEqual(['a.jpg', 'b.NEF', 'e.dng']);
    expect(() => collectInputs(['rel.jpg'])).toThrow(/absolute/);
  });
  it('exports full size unless a size is given', () => {
    expect(engineExportOptions({})).toEqual({ longEdge: 0 });
    expect(engineExportOptions({ long_edge: 2048, quality: 85, color_space: 'displayP3' })).toEqual({ longEdge: 2048, quality: 85, colorSpace: 'displayP3' });
    expect(engineExportOptions({ percent: 50 })).toEqual({ percent: 50 });
  });
});

describe('edits', () => {
  it('picks only edit fields and knows when there are none', () => {
    expect(editsOf({ input_path: 'x', auto: true, quality: 90 })).toEqual({ auto: true });
    expect(hasEdits(editsOf({ input_path: 'x', preset_amount: 50 }))).toBe(false);
    expect(hasEdits(editsOf({ values: { 'light.exposure': 1 } }))).toBe(true);
  });
  it('mask schema has no JSON Schema tuples', () => {
    expect(JSON.stringify(z.toJSONSchema(maskSchema))).not.toContain('prefixItems');
    expect(maskSchema.parse({ kind: 'radial', center: [0.5, 0.5], rx: 0.2, ry: 0.2, adjust: { exposure: 1 } }).kind).toBe('radial');
  });
});

describe('run_lightcraft_commands references', () => {
  it('replaces $steps values', () => {
    expect(substitute({ id: '$steps[0].activeMask', ids: ['$steps[1].imported[1]'], x: '$x' }, [{ activeMask: 4 }, { imported: [7, 9] }])).toEqual({ id: 4, ids: [9], x: '$x' });
    expect(() => substitute('$steps[3].id', [])).toThrow();
  });
});
