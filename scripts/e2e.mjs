// End-to-end test over real MCP stdio against dist/bundle.cjs (what the .mcpb runs).
// Needs LightCraft installed. Usage: npm run build && npm run test:e2e
// E2E_BUNDLE=<path to bundle.cjs> tests another build (e.g. the contents of an unpacked .mcpb).
// Draws its own synthetic images and makes synthetic DNGs with lightcraft-cli (no personal files).
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { execFileSync } from 'child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { deflateSync } from 'zlib';

const out = mkdtempSync(join(tmpdir(), 'lc-e2e-'));
const src = join(out, 'Imágenes ñandú');
mkdirSync(src, { recursive: true });

// --- tiny PNG writer
function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(path, w, h, pixel) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 3 + 1)] = 0;
    for (let x = 0; x < w; x++) {
      const [r, g, b] = pixel(x, y);
      const o = y * (w * 3 + 1) + 1 + x * 3;
      raw[o] = r; raw[o + 1] = g; raw[o + 2] = b;
    }
  }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  writeFileSync(path, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
}
// a photo-like scene: sky-to-grass gradient with a round orange subject in the middle
// a photo-like scene: sky-to-grass gradient with a round orange subject; two "burst" frames, one blurred
const photo = join(src, 'foto.png');
const scene = (x, y) => {
  const d = Math.hypot(x - 320, y - 250);
  if (d < 110) { const k = 1 - d / 220; return [Math.round(240 * k + 15), Math.round(140 * k), 30]; }
  return y < 300 ? [120 + (y >> 2), 170 + (y >> 3), 235] : [60, 140 + ((x * 7) % 30), 60];
};
png(photo, 640, 480, scene);
png(join(src, 'foto_movida.png'), 640, 480, (x, y) => {
  const a = scene(x, y), b = scene(Math.max(0, x - 6), y), c = scene(Math.min(639, x + 6), y);
  return a.map((v, i) => Math.round((v + b[i] + c[i]) / 3));
});

// raw inputs made by LightCraft itself: three bracketed DNGs and five overlapping panorama views
const cliPath = process.env.LIGHTCRAFT_CLI_PATH;
const bracketDir = join(out, 'bracket');
const panoDir = join(out, 'pano');

const client = new Client({ name: 'e2e', version: '1.0.0' });
await client.connect(new StdioClientTransport({ command: process.execPath, args: [process.env.E2E_BUNDLE || 'dist/bundle.cjs'] }));

let failed = 0;
const check = (cond, msg) => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${msg}`); if (!cond) failed++; };
const call = async (name, args) => {
  const res = await client.callTool({ name, arguments: args });
  const body = JSON.parse(res.content.find((c) => c.type === 'text').text);
  if (res.isError) console.log('      ', JSON.stringify(body).slice(0, 400));
  return { ...body, _img: res.content.some((c) => c.type === 'image') };
};
const t0 = Date.now();

const { tools } = await client.listTools();
check(tools.length === 10, `10 tools exposed (${tools.map((t) => t.name).join(', ')})`);
check(!JSON.stringify(tools.map((t) => t.inputSchema)).includes('"items":['), 'no JSON Schema tuples in any input schema');

const st = await call('get_lightcraft_status', {});
check(st.ready && /lightcraft-cli \d/.test(st.version ?? '') && st.commands > 200 && st.controls > 100, `status: ${st.version}, ${st.commands} commands, ${st.controls} controls, ${st.platform}`);

execFileSync(cliPath || st.cli, ['synth-merge', 'hdr', '-o', bracketDir]);
execFileSync(cliPath || st.cli, ['synth-merge', 'panorama', '-o', panoDir]);
const dng = join(bracketDir, 'bracket-1.dng');

const info = await call('get_photo_info', { input_path: dng, all_metadata: true });
check(info.success && info.raw === true && info.width === 1800 && Array.isArray(info.metadata?.exif), `get_photo_info: raw DNG ${info.width}x${info.height}, ${info.metadata?.exif?.length} EXIF tags`);

const conv = await call('convert_photos', { input_dir: bracketDir, formats: ['jpg', 'avif'], long_edge: 900, quality: 80, output_dir: join(out, 'conv') });
check(conv.success && conv.converted === 3 && conv.results.every((r) => r.outputs.length === 2 && r.outputs[0].width === 900), 'convert_photos: 3 raw DNGs to JPEG + AVIF at 900 px');
const full = await call('convert_photos', { input_path: photo, formats: ['png', 'tiff'], output_dir: join(out, 'conv') });
check(full.success && full.results?.[0]?.outputs?.[0]?.width === 640, 'no size given = full size (not the engine default of 3000 px)');

const again = await call('convert_photos', { input_path: photo, formats: ['png'], output_dir: join(out, 'conv') });
const refused = await call('convert_photos', { input_path: photo, formats: ['png'], output_path: full.results?.[0]?.outputs?.[0]?.path });
check(again.success && /_2\.png$/.test(again.results?.[0]?.outputs?.[0]?.path ?? '') && !refused.success && /already exists/.test(JSON.stringify(refused)), 'never overwrites: a free name (_2) in a folder, an error for an existing output_path');

const dev = await call('develop_photos', {
  input_path: dng,
  auto: true,
  white_balance: { mode: 'daylight' },
  profile: 'lc.vivid',
  values: { 'light.highlights': -40, 'light.shadows': 30, 'effects.clarity': 15, 'vignette.amount': -20, 'detail.sharpenAmount': 40 },
  curve_preset: 'Medium Contrast',
  crop: { aspect: '4x5' },
  heal: [{ at: [0.3, 0.3], size: 0.02 }],
  masks: [
    { kind: 'linear', start: [0.5, 0], end: [0.5, 0.5], adjust: { exposure: -0.7, dehaze: 20 } },
    { kind: 'radial', center: [0.5, 0.55], rx: 0.25, ry: 0.3, feather: 60, invert: true, adjust: { exposure: -0.5 } },
    { kind: 'color', color_at: [0.5, 0.5], adjust: { saturation: 20 } },
  ],
  formats: ['jpg', 'dng', 'tiff'],
  long_edge: 1200,
  watermark: '© e2e',
  output_dir: join(out, 'dev'),
});
const jpg = dev.outputs?.find((o) => o.format === 'jpg');
check(dev.success && dev._img && dev.outputs?.length === 3 && dev.applied?.length >= 9, `develop_photos: ${dev.applied?.length} edit steps on a raw → JPEG + DNG + TIFF with preview`);
check(jpg && Math.max(jpg.width, jpg.height) === 1200 && [0.8, 1.25].some((r) => Math.abs(jpg.width / jpg.height - r) < 0.01), `crop 4x5 (follows the photo's orientation) + long edge 1200 → ${jpg?.width}x${jpg?.height}`);

const batch = await call('develop_photos', { input_dir: src, preset: 'lc.warm-glow', black_and_white: true, formats: ['webp'], quality: 85, output_dir: join(out, 'bw'), preview: false });
check(batch.success && batch.developed === 2 && batch.results.every((r) => r.outputs[0].path.endsWith('_edit.webp')), 'develop_photos batch: a folder with a preset + black & white → WebP');
const mk = await call('run_lightcraft_commands', { paths: [photo], steps: [{ id: 'develop.set', params: { values: { 'color.saturation': -100, 'light.exposure': 0.5 } } }, { id: 'preset.create', params: { name: 'Mono E2E' } }, { id: 'preset.export', params: { path: join(out, 'mono.lcpreset') } }] });
const fromFile = await call('develop_photos', { input_dir: src, preset_file: join(out, 'mono.lcpreset'), formats: ['jpg'], output_dir: join(out, 'preset'), preview: false });
check(mk.success && fromFile.success && fromFile.developed === 2, 'preset_file: a saved preset file imported once and applied to a whole folder');
const badPreset = await call('develop_photos', { input_path: photo, preset: 'no-such-preset', output_dir: join(out, 'x') });
check(!badPreset.success && /unknown preset/.test(JSON.stringify(badPreset)), 'an unknown preset is reported, nothing written');
const jpegDng = await call('develop_photos', { input_path: photo, formats: ['dng'], output_dir: join(out, 'x') });
check(!jpegDng.success && /needs a raw/.test(JSON.stringify(jpegDng)), 'DNG export of a non-raw photo is refused with a clear message');

const pv = await call('render_preview', { input_path: dng, values: { 'light.exposure': 1 }, size: 400, output_path: join(out, 'preview.jpg') });
check(pv.success && pv._img && existsSync(pv.output ?? ''), 'render_preview: a raw with a trial edit, saved');

const hdr = await call('merge_photos', { mode: 'hdr', input_dir: bracketDir, deghost: 'low', formats: ['dng', 'jpg'], long_edge: 1000, output_dir: join(out, 'merge') });
check(hdr.success && hdr.outputs?.length === 2 && hdr.details?.ev?.length === 3 && !existsSync(join(bracketDir, 'bracket-0-HDR.dng')), 'merge_photos HDR: DNG + JPEG in the output folder, nothing written next to the inputs');
const pano = await call('merge_photos', { mode: 'panorama', input_dir: panoDir, auto_crop: true, auto: true, formats: ['jpg'], output_dir: join(out, 'merge'), preview: false });
check(pano.success && pano.outputs?.[0]?.width > 2000 && !existsSync(join(panoDir, 'view-0-Pano.dng')), `merge_photos panorama: ${pano.outputs?.[0]?.width}x${pano.outputs?.[0]?.height} JPEG, developed`);

const cull = await call('analyze_photos', { input_dir: src, min_sharpness: 20, copy_best_to: join(out, 'best') });
const sharp = cull.photos?.find((p) => /foto\.png$/.test(p.path));
const blur = cull.photos?.find((p) => /movida/.test(p.path));
check(cull.success && sharp?.sharpness > blur?.sharpness && blur?.blurry === true && cull.copied?.length === 1, `analyze_photos: sharp ${sharp?.sharpness} vs blurred ${blur?.sharpness}; only the sharp one copied`);

const cat1 = await call('list_lightcraft_catalog', { kind: 'controls', filter: 'light' });
const cat2 = await call('list_lightcraft_catalog', { kind: 'presets' });
const cat3 = await call('list_lightcraft_catalog', { kind: 'profiles', filter: 'film' });
const cat4 = await call('list_lightcraft_catalog', { kind: 'commands', filter: 'mask' });
check(cat1.count >= 6 && cat2.count >= 5 && cat3.count >= 2 && cat4.count >= 10, `catalog: ${cat1.count} light controls, ${cat2.count} presets, ${cat3.count} film profiles, ${cat4.count} mask commands`);

const rc = await call('run_lightcraft_commands', {
  paths: [photo],
  steps: [
    { id: 'mask.add', params: { kind: 'radial', center: [0.5, 0.5], rx: 0.2, ry: 0.2 } },
    { id: 'mask.adjust', params: { id: '$steps[0].activeMask', values: { exposure: 1 } } },
    { id: 'photo.rate', params: { rating: 5 } },
  ],
  exports: [{ path: join(out, 'run', 'radial.jpg') }],
  preview: true,
});
check(rc.success && rc.exported?.length === 1 && rc._img && existsSync(join(out, 'run', 'radial.jpg')), 'run_lightcraft_commands: radial mask with $steps id, rating, export');

const relPath = await call('develop_photos', { input_path: 'foto.png', auto: true });
check(!relPath.success && /absolute/.test(relPath.error ?? ''), 'relative paths are rejected');
check(readdirSync(src).length === 2, 'the input folder still holds only the 2 original images (no sidecars, no outputs)');

await client.close();
console.log(`\n${failed ? `${failed} FAILED` : 'ALL PASSED'} in ${((Date.now() - t0) / 1000).toFixed(1)} s · output in ${out}`);
process.exit(failed ? 1 : 0);
