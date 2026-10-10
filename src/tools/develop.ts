import { copyFileSync, statSync, writeFileSync } from 'fs';
import * as path from 'path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { LightCraftSession, withSession } from '../engine.js';
import {
  READ, WRITE, WritableFormat, collectInputs, errorResult, exportAll, exportSchema, formatsSchema, inputsOf, inputsSchema, isRaw, json,
  outputFor, outputSchema, preview, Saved, withPreview,
} from './common.js';

// ---------------------------------------------------------------- edits

const point = z.array(z.number().min(0).max(1)).length(2).describe('[x, y], normalized 0..1 from the top-left.');

const maskAdjustSchema = z
  .object({
    exposure: z.number().optional(),
    contrast: z.number().optional(),
    highlights: z.number().optional(),
    shadows: z.number().optional(),
    whites: z.number().optional(),
    blacks: z.number().optional(),
    temp: z.number().optional(),
    tint: z.number().optional(),
    texture: z.number().optional(),
    clarity: z.number().optional(),
    dehaze: z.number().optional(),
    hue: z.number().optional(),
    saturation: z.number().optional(),
    sharpness: z.number().optional(),
    noise: z.number().optional(),
    amount: z.number().optional(),
  })
  .describe('Local adjustments inside the mask (exposure in stops, the others -100..100).');

export const maskSchema = z.object({
  kind: z.enum(['linear', 'radial', 'luminance', 'color', 'brush', 'subject', 'sky', 'background']).describe(
    'linear (graduated filter: start → end), radial (center, rx, ry, angle, feather), luminance (lo..hi 0..1), color (the colour at color_at), ' +
      'brush (strokes), subject / sky / background (automatic; LightCraft 0.4 uses classical heuristics, not AI).',
  ),
  start: point.optional(),
  end: point.optional(),
  center: point.optional(),
  rx: z.number().positive().optional().describe('radial: horizontal radius, fraction of the width.'),
  ry: z.number().positive().optional(),
  angle: z.number().optional(),
  feather: z.number().min(0).max(100).optional(),
  lo: z.number().min(0).max(1).optional(),
  hi: z.number().min(0).max(1).optional(),
  color_at: point.optional().describe('color: sample point.'),
  strokes: z.array(z.array(point).min(1)).optional().describe('brush: strokes, each a list of points.'),
  brush_size: z.number().positive().max(1).optional().describe('brush: fraction of the long edge (default 0.03).'),
  invert: z.boolean().optional(),
  name: z.string().optional(),
  adjust: maskAdjustSchema,
});

export const editSchema = {
  preset: z.string().optional().describe('Preset id (list_lightcraft_catalog kind=presets), e.g. lc.warm-glow.'),
  preset_amount: z.number().min(0).max(200).optional().describe('Preset strength in % (default 100).'),
  preset_file: z.string().optional().describe('Absolute path of a preset to import and apply: .xmp, .lrtemplate, .lcpreset, a photo with edits (DNG/JPEG "DNG preset").'),
  profile: z.string().optional().describe('Profile id (list_lightcraft_catalog kind=profiles), e.g. lc.vivid, lc.portrait, lc.film.golden-hour.'),
  profile_amount: z.number().min(0).max(200).optional(),
  auto: z.boolean().optional().describe('Auto tone (exposure, contrast, highlights, shadows, whites, blacks, vibrance).'),
  white_balance: z
    .object({
      mode: z.enum(['asShot', 'auto', 'daylight', 'cloudy', 'shade', 'tungsten', 'fluorescent', 'flash', 'custom']).optional(),
      temp: z.number().optional().describe('Kelvin for raw; relative for JPEG.'),
      tint: z.number().optional(),
      neutral_at: point.optional().describe('Eyedropper: a point that should be neutral grey.'),
    })
    .optional(),
  black_and_white: z.boolean().optional().describe('Monochrome with an automatic B&W mix.'),
  values: z
    .record(z.string(), z.number())
    .optional()
    .describe(
      'Develop sliders by control id (list_lightcraft_catalog kind=controls), e.g. {"light.exposure": 0.5, "light.contrast": 20, ' +
        '"light.highlights": -40, "light.shadows": 30, "color.vibrance": 25, "effects.clarity": 15, "effects.dehaze": 10, ' +
        '"vignette.amount": -20, "grain.amount": 15, "detail.sharpenAmount": 50, "detail.nrLuminance": 20, "grading.shadows.hue": 210}.',
    ),
  settings: z.record(z.string(), z.any()).optional().describe('Advanced: a partial DevelopSettings JSON deep-merged into the photo (see get_photo_info develop).'),
  curve: z
    .object({ channel: z.enum(['master', 'red', 'green', 'blue']).default('master'), points: z.array(z.array(z.number().min(0).max(1)).length(2)).min(2).max(16) })
    .optional()
    .describe('Point tone curve, points [[in, out], ...] in 0..1.'),
  curve_preset: z.string().optional().describe('Built-in point curve: Linear, Medium Contrast, Strong Contrast...'),
  crop: z
    .object({
      rect: z.array(z.number().min(0).max(1)).length(4).optional().describe('[x0, y0, x1, y1] normalized.'),
      aspect: z.string().optional().describe('original, free, 1x1, 4x5, 5x7, 2x3, 4x3, 16x9, 16x10 (centred, largest).'),
      angle: z.number().min(-45).max(45).optional().describe('Straighten in degrees.'),
      auto_straighten: z.boolean().optional().describe('Level the horizon automatically.'),
    })
    .optional(),
  upright: z.enum(['off', 'auto', 'level', 'vertical', 'full']).optional().describe('Perspective correction.'),
  rotate: z.enum(['left', 'right']).optional(),
  flip: z.enum(['horizontal', 'vertical']).optional(),
  remove_dust: z.number().min(0).max(100).optional().describe('Find sensor-dust spots and heal them, at this sensitivity (50 is a good start).'),
  heal: z
    .array(z.object({ at: point, size: z.number().positive().max(0.5).default(0.02).describe('Fraction of the long edge.'), mode: z.enum(['heal', 'clone', 'remove']).default('heal') }))
    .max(500)
    .optional()
    .describe('Spot removal: blemishes, dust, small objects.'),
  red_eye: z.array(z.object({ center: point, radius: z.number().positive().max(0.2).default(0.02) })).max(20).optional(),
  masks: z.array(maskSchema).max(50).optional().describe('Local adjustments.'),
  commands: z
    .array(z.object({ id: z.string(), params: z.record(z.string(), z.any()).optional() }))
    .max(200)
    .optional()
    .describe('Any other engine commands, run last on the photo (list_lightcraft_catalog kind=commands).'),
};
const editObject = z.object(editSchema);
export type Edits = z.infer<typeof editObject>;

/** Presets imported from files, per session (a batch imports each file once). */
const importedPresets = new WeakMap<LightCraftSession, Map<string, string>>();

const MASK_KIND: Record<string, string> = { luminance: 'luminanceRange', color: 'colorRange' };

/** Apply the edits to photo `id` (made active first). Returns a short log. */
export async function applyEdits(s: LightCraftSession, id: number, e: Edits): Promise<string[]> {
  const log: string[] = [];
  const step = async (label: string, fn: () => Promise<unknown>) => {
    try {
      await fn();
      log.push(label);
    } catch (err) {
      throw new Error(`${label}: ${err instanceof Error ? err.message : String(err)}`);
    }
  };
  await s.json('select_photos', { ids: [id], active: id });
  if (e.preset_file) {
    await step('preset_file', async () => {
      const [file] = collectInputs([e.preset_file!], undefined, ['xmp', 'lrtemplate', 'lcpreset', 'dng', 'jpg', 'jpeg', 'tif', 'tiff', 'lmp', 'zip']);
      let known = importedPresets.get(s);
      if (!known) importedPresets.set(s, (known = new Map()));
      let pid = known.get(file);
      if (!pid) {
        // imported once per session; the new id is the one that was not listed before
        const before = new Set(((await s.cmd('presets.list')) ?? []).map((p: any) => p.id));
        const r = await s.cmd('preset.import', { paths: [file] });
        pid = ((await s.cmd('presets.list')) ?? []).map((p: any) => p.id).find((x: string) => !before.has(x));
        if (!pid) throw new Error(`no new preset found in ${path.basename(file)} (${JSON.stringify(r).slice(0, 200)})`);
        known.set(file, pid);
      }
      await s.cmd('preset.apply', { id: pid, ids: [id], ...(e.preset_amount !== undefined ? { amount: e.preset_amount } : {}) });
    });
  }
  if (e.preset) await step(`preset ${e.preset}`, () => s.cmd('preset.apply', { id: e.preset, ids: [id], ...(e.preset_amount !== undefined ? { amount: e.preset_amount } : {}) }));
  if (e.profile) await step(`profile ${e.profile}`, () => s.cmd('develop.profile', { id: e.profile, ...(e.profile_amount !== undefined ? { amount: e.profile_amount } : {}) }));
  if (e.black_and_white) await step('black & white', () => s.cmd('develop.autoBwMix'));
  if (e.auto) await step('auto tone', () => s.cmd('develop.auto'));
  if (e.white_balance) {
    const wb = e.white_balance;
    if (wb.neutral_at) await step('white balance (eyedropper)', () => s.cmd('develop.wbPick', { x: wb.neutral_at![0], y: wb.neutral_at![1] }));
    if (wb.mode || wb.temp !== undefined || wb.tint !== undefined) {
      const mode = wb.mode ?? (wb.temp !== undefined || wb.tint !== undefined ? 'custom' : 'asShot');
      await step(`white balance ${mode}`, () => s.cmd('develop.wb', { mode, ...(wb.temp !== undefined ? { temp: wb.temp } : {}), ...(wb.tint !== undefined ? { tint: wb.tint } : {}) }));
    }
  }
  if (e.values && Object.keys(e.values).length) await step(`sliders ${Object.keys(e.values).join(', ')}`, () => s.json('set_develop', { id, values: e.values }));
  if (e.settings) await step('settings', () => s.json('set_develop', { id, settings: e.settings, label: 'MCP settings' }));
  if (e.curve_preset) await step(`curve ${e.curve_preset}`, () => s.cmd('curve.applyPreset', { name: e.curve_preset }));
  if (e.curve) await step(`curve ${e.curve.channel}`, () => s.cmd('develop.curve', { channel: e.curve!.channel, points: e.curve!.points }));
  if (e.rotate) await step(`rotate ${e.rotate}`, () => s.cmd(e.rotate === 'left' ? 'photo.rotateLeft' : 'photo.rotateRight', { ids: [id] }));
  if (e.flip) await step(`flip ${e.flip}`, () => s.cmd(e.flip === 'vertical' ? 'photo.flipVertical' : 'photo.flipHorizontal', { ids: [id] }));
  if (e.upright) await step(`upright ${e.upright}`, () => s.cmd('geometry.upright', { mode: e.upright }));
  if (e.crop) {
    const c = e.crop;
    if (c.auto_straighten) await step('auto straighten', () => s.cmd('crop.autoStraighten'));
    if (c.aspect) await step(`aspect ${c.aspect}`, () => s.cmd('crop.aspect', { aspect: c.aspect }));
    if (c.rect || c.angle !== undefined) await step('crop', () => s.json('crop', { id, ...(c.rect ? { rect: c.rect } : {}), ...(c.angle !== undefined ? { angle: c.angle } : {}) }));
  }
  if (e.remove_dust !== undefined) await step('remove dust', () => s.cmd('spot.findDust', { sensitivity: e.remove_dust }));
  for (const h of e.heal ?? []) await step(`${h.mode} spot`, () => s.cmd('spot.add', { mode: h.mode, points: [h.at], size: h.size }));
  for (const r of e.red_eye ?? []) await step('red eye', () => s.cmd('redeye.add', { center: r.center, rx: r.radius, ry: r.radius }));
  for (const [i, m] of (e.masks ?? []).entries()) {
    await step(`mask ${i + 1} (${m.kind})`, async () => {
      const shape: Record<string, unknown> = { kind: MASK_KIND[m.kind] ?? m.kind };
      for (const k of ['start', 'end', 'center', 'rx', 'ry', 'angle', 'feather', 'lo', 'hi'] as const) if (m[k] !== undefined) shape[k] = m[k];
      if (m.name) shape['name'] = m.name;
      if (m.kind === 'linear' && !(m.start && m.end)) throw new Error('linear needs start and end.');
      if (m.kind === 'radial' && !m.center) throw new Error('radial needs center (and rx, ry).');
      const r = await s.cmd('mask.add', shape);
      const mid = r?.activeMask;
      if (m.kind === 'color') {
        if (!m.color_at) throw new Error('color needs color_at.');
        await s.cmd('mask.sampleColor', { x: m.color_at[0], y: m.color_at[1], id: mid });
      }
      if (m.kind === 'brush') {
        if (!m.strokes?.length) throw new Error('brush needs strokes.');
        for (const st of m.strokes) await s.cmd('mask.brushStroke', { id: mid, points: st, ...(m.brush_size ? { size: m.brush_size } : {}) });
      }
      if (m.invert) await s.cmd('mask.invert', { id: mid });
      await s.cmd('mask.adjust', { id: mid, values: m.adjust });
    });
  }
  for (const c of e.commands ?? []) await step(c.id, () => s.cmd(c.id, c.params ?? {}));
  return log;
}

export function hasEdits(e: Edits): boolean {
  return Object.entries(e).some(([k, v]) => v !== undefined && k !== 'preset_amount' && k !== 'profile_amount');
}

/** Pick the edit fields out of a tool's arguments. */
export function editsOf(a: Record<string, any>): Edits {
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(editSchema)) if (a[k] !== undefined) out[k] = a[k];
  return out as Edits;
}

// ---------------------------------------------------------------- tools

export function registerDevelopTools(server: McpServer): void {
  server.registerTool(
    'develop_photos',
    {
      title: 'Develop photos',
      description:
        'Non-destructive raw and photo development, then export: auto tone, white balance (presets, Kelvin, eyedropper), any of the ' +
        '114 develop sliders (exposure, contrast, highlights, shadows, whites, blacks, texture, clarity, dehaze, vibrance, saturation, ' +
        'colour mixer, colour grading, tone curve, vignette, grain, sharpening, noise reduction, lens corrections...), presets and ' +
        'profiles (also imported Lightroom .xmp / .lrtemplate presets), black & white, crop / aspect / straighten / upright, spot ' +
        'healing, dust removal, red eye, and masks (graduated, radial, luminance, colour, brush, subject, sky, background) with local ' +
        'adjustments. One photo, a list or a whole folder (the same edits on each). Originals are only read; results are exported as ' +
        'JPEG / PNG / TIFF / WebP / AVIF / DNG with size, quality, colour space, sharpening, metadata and watermark options.',
      inputSchema: {
        ...inputsSchema,
        ...editSchema,
        formats: formatsSchema.default(['jpg']),
        suffix: z.string().default('_edit').describe('Added to the file name when no output_path.'),
        ...outputSchema,
        ...exportSchema,
        preview: z.boolean().default(true).describe('Return a preview of the (first) result.'),
      },
      annotations: WRITE,
    },
    async (args) => {
      try {
        const inputs = inputsOf(args);
        if (args.output_path && inputs.length > 1) throw new Error('output_path needs a single input; use output_dir.');
        const edits = editsOf(args);
        return await withSession(async (s) => {
          const ids = await s.importFiles(inputs);
          const done: { input: string; applied: string[]; outputs: Saved[] }[] = [];
          const errors: { input: string; error: string }[] = [];
          let img: { data: string; mimeType: string } | undefined;
          for (const [i, input] of inputs.entries()) {
            try {
              const applied = await applyEdits(s, ids[i], edits);
              const outputs = await exportAll(s, ids[i], { input, suffix: args.suffix, output_dir: args.output_dir, output_path: args.output_path, overwrite: args.overwrite }, args.formats, args);
              if (args.preview && !img) img = await preview(s, ids[i], 1024);
              done.push({ input, applied, outputs });
            } catch (e) {
              errors.push({ input, error: e instanceof Error ? e.message : String(e) });
            }
          }
          const body =
            inputs.length === 1 && done.length === 1
              ? { success: true, ...done[0] }
              : { success: errors.length === 0, developed: done.length, results: done.map((d) => ({ input: d.input, outputs: d.outputs })), ...(done[0] ? { applied: done[0].applied } : {}), ...(errors.length ? { errors } : {}) };
          return withPreview(body, img, done.length === 0);
        });
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  server.registerTool(
    'convert_photos',
    {
      title: 'Convert photos',
      description:
        'Export photos as they are (raw files with LightCraft\'s default rendering) to JPEG, PNG, TIFF, WebP, AVIF or DNG: one file, ' +
        'a list or a whole folder, resized, with quality, colour space, bit depth, output sharpening, metadata policy and watermark. ' +
        'Typical uses: raw → JPEG for sharing, web-size copies, AVIF / WebP versions, 16-bit TIFF for printing.',
      inputSchema: {
        ...inputsSchema,
        formats: formatsSchema.default(['jpg']),
        suffix: z.string().default('').describe('Added to the file name when no output_path.'),
        ...outputSchema,
        ...exportSchema,
      },
      annotations: WRITE,
    },
    async (args) => {
      try {
        const inputs = inputsOf(args);
        if (args.output_path && inputs.length > 1) throw new Error('output_path needs a single input; use output_dir.');
        return json(
          await withSession(async (s) => {
            const ids = await s.importFiles(inputs);
            const done: { input: string; outputs: Saved[] }[] = [];
            const errors: { input: string; error: string }[] = [];
            for (const [i, input] of inputs.entries()) {
              try {
                done.push({ input, outputs: await exportAll(s, ids[i], { input, suffix: args.suffix, output_dir: args.output_dir, output_path: args.output_path, overwrite: args.overwrite }, args.formats, args) });
              } catch (e) {
                errors.push({ input, error: e instanceof Error ? e.message : String(e) });
              }
            }
            return { success: errors.length === 0, converted: done.length, results: done, ...(errors.length ? { errors } : {}) };
          }),
        );
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  server.registerTool(
    'render_preview',
    {
      title: 'Preview a photo',
      description:
        'Render a photo (raw or not) as Claude can see it, optionally with develop edits applied first (the same fields as develop_photos) ' +
        'to try a look before exporting. Nothing is written unless save or output_path.',
      inputSchema: {
        input_path: z.string().describe('Absolute path.'),
        ...editSchema,
        size: z.number().int().min(64).max(4096).default(1024).describe('Long edge in px.'),
        save: z.boolean().default(false).describe('Also write <name>_preview.jpg next to the input (or output_path).'),
        output_path: z.string().optional(),
        overwrite: z.boolean().default(false),
      },
      annotations: READ,
    },
    async (args) => {
      try {
        const [file] = collectInputs([args.input_path]);
        return await withSession(async (s) => {
          const [id] = await s.importFiles([file]);
          const applied = hasEdits(editsOf(args)) ? await applyEdits(s, id, editsOf(args)) : [];
          const img = await preview(s, id, args.size);
          if (!img) throw new Error('LightCraft returned no preview.');
          let saved: string | undefined;
          if (args.save || args.output_path) {
            saved = outputFor(file, 'jpg', '_preview', { output_path: args.output_path, overwrite: args.overwrite });
            writeFileSync(saved, Buffer.from(img.data, 'base64'));
          }
          return withPreview({ success: true, input: file, ...(applied.length ? { applied } : {}), ...(saved ? { output: saved } : {}) }, img);
        });
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  server.registerTool(
    'get_photo_info',
    {
      title: 'Photo information',
      description:
        'Camera, lens, exposure (shutter, aperture, ISO, focal length), capture time, GPS, size, raw or not, rating and keywords, plus ' +
        'every EXIF / XMP tag when all_metadata is true, and the develop settings LightCraft starts from (as-shot white balance...).',
      inputSchema: {
        input_path: z.string().describe('Absolute path.'),
        all_metadata: z.boolean().default(false).describe('Also list every EXIF / TIFF / GPS / XMP tag.'),
      },
      annotations: READ,
    },
    async (args) => {
      try {
        const [file] = collectInputs([args.input_path]);
        return json(
          await withSession(async (s) => {
            const [id] = await s.importFiles([file]);
            const p = await s.cmd('photo.inspect', { id });
            const { develop, ...rest } = p ?? {};
            const out: Record<string, unknown> = { success: true, path: file, bytes: statSync(file).size, raw: isRaw(file), ...rest };
            if (args.all_metadata) out['metadata'] = await s.cmd('photo.allMetadata', { id });
            return out;
          }),
        );
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  server.registerTool(
    'merge_photos',
    {
      title: 'Merge HDR / panorama',
      description:
        'Photo Merge: an HDR from bracketed exposures, a panorama from overlapping shots, or an HDR panorama — written as a raw DNG ' +
        '(still fully editable) and optionally developed and exported as JPEG / TIFF... too. Inputs are copied to a private folder, so ' +
        'nothing is written next to your originals.',
      inputSchema: {
        mode: z.enum(['hdr', 'panorama', 'hdr_panorama']),
        ...inputsSchema,
        deghost: z.enum(['none', 'low', 'medium', 'high']).optional().describe('HDR: remove moving objects.'),
        align: z.boolean().optional().describe('HDR: align the frames (default true).'),
        projection: z.enum(['auto', 'spherical', 'cylindrical', 'perspective']).optional().describe('Panorama.'),
        boundary_warp: z.number().min(0).max(100).optional().describe('Panorama: stretch the edges to fill the frame.'),
        auto_crop: z.boolean().optional().describe('Panorama: crop away the empty edges.'),
        fill_edges: z.boolean().optional().describe('Panorama: fill the empty edges.'),
        bracket: z.number().int().min(0).max(9).optional().describe('HDR panorama: frames per bracket (0 = from EXIF).'),
        ...editSchema,
        formats: formatsSchema.default(['dng']).describe('dng keeps the merge raw and editable; add jpg / tiff for a developed copy.'),
        name: z.string().optional().describe('Output file name without extension (default <first>-HDR / -Pano / -HDR-Pano).'),
        output_dir: z.string().optional().describe('Absolute folder (default: next to the first input).'),
        output_path: z.string().optional(),
        overwrite: z.boolean().default(false),
        ...exportSchema,
        preview: z.boolean().default(true),
      },
      annotations: WRITE,
    },
    async (args) => {
      try {
        const inputs = inputsOf(args);
        if (inputs.length < 2) throw new Error('A merge needs at least 2 photos.');
        return await withSession(async (s) => {
          const ids = await s.importFiles(s.stage(inputs));
          const params: Record<string, unknown> = { ids };
          if (args.deghost) params['deghost'] = args.deghost;
          if (args.align !== undefined) params['align'] = args.align;
          if (args.projection) params['projection'] = args.projection;
          if (args.boundary_warp !== undefined) params['boundaryWarp'] = args.boundary_warp;
          if (args.auto_crop !== undefined) params['autoCrop'] = args.auto_crop;
          if (args.fill_edges !== undefined) params['fillEdges'] = args.fill_edges;
          if (args.bracket !== undefined) params['bracket'] = args.bracket;
          const cmd = { hdr: 'merge.hdr', panorama: 'merge.panorama', hdr_panorama: 'merge.hdrPanorama' }[args.mode];
          const r = await s.cmd(cmd, params);
          const mergedId: number = r?.id;
          const mergedPath: string = r?.path;
          if (typeof mergedId !== 'number' || !mergedPath) throw new Error(`The merge returned no photo: ${JSON.stringify(r).slice(0, 300)}`);
          const tag = { hdr: 'HDR', panorama: 'Pano', hdr_panorama: 'HDR-Pano' }[args.mode];
          const stem = args.name ?? `${path.basename(inputs[0]).replace(/\.[^.]+$/, '')}-${tag}`;
          const base = path.join(args.output_dir ?? path.dirname(inputs[0]), `${stem}.dng`);
          const applied = hasEdits(editsOf(args)) ? await applyEdits(s, mergedId, editsOf(args)) : [];
          const outputs: Saved[] = [];
          const formats = args.formats as WritableFormat[];
          const rest = formats.filter((f) => f !== 'dng');
          if (rest.length) {
            const named = args.output_path && path.extname(args.output_path).toLowerCase() !== '.dng' ? args.output_path : undefined;
            outputs.push(...(await exportAll(s, mergedId, { input: base, suffix: '', output_dir: path.dirname(base), output_path: named, overwrite: args.overwrite }, rest, args)));
          }
          if (formats.includes('dng')) {
            // the merge itself is the DNG (edits travel in the library, so a developed DNG is exported when edited)
            const target = outputFor(base + '.__src', 'dng', '', {
              output_path: args.output_path && path.extname(args.output_path).toLowerCase() === '.dng' ? args.output_path : base,
              overwrite: args.overwrite,
            });
            if (applied.length) outputs.push(...(await exportAll(s, mergedId, { input: mergedPath, suffix: '', output_path: target, overwrite: true }, ['dng'], args)));
            else {
              copyFileSync(mergedPath, target);
              outputs.push({ path: target, format: 'dng', bytes: statSync(target).size, width: r.width, height: r.height });
            }
          }
          const { id: _i, path: _p, ...details } = r;
          void _i;
          void _p;
          return withPreview({ success: true, mode: args.mode, merged: inputs.length, ...(applied.length ? { applied } : {}), outputs, details }, args.preview ? await preview(s, mergedId, 1024) : undefined);
        });
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  server.registerTool(
    'analyze_photos',
    {
      title: 'Cull photos',
      description:
        'Culling help for a shoot: scores each photo for focus (sharpness 0..100) and clipped highlights / shadows, groups look-alike ' +
        'shots taken within 10 s and marks the sharpest of each group. Optionally copies the best (or every photo above min_sharpness) ' +
        'to a folder. Originals are never moved or changed.',
      inputSchema: {
        ...inputsSchema,
        min_sharpness: z.number().min(0).max(100).optional().describe('Below this the photo counts as blurry.'),
        copy_best_to: z.string().optional().describe('Absolute folder: copy the best photo of each group plus every sharp single.'),
        overwrite: z.boolean().default(false),
      },
      annotations: WRITE,
    },
    async (args) => {
      try {
        const inputs = inputsOf(args);
        return json(
          await withSession(async (s) => {
            const ids = await s.importFiles(inputs);
            const r = await s.cmd('photo.analyze', { ids, pickBest: true, ...(args.min_sharpness !== undefined ? { rejectBelow: args.min_sharpness } : {}) });
            const byId = new Map<number, string>(ids.map((id, i) => [id, inputs[i]]));
            const photos = ((r?.photos ?? []) as any[]).map((p) => ({
              path: byId.get(p.id),
              sharpness: Math.round(p.sharpness * 10) / 10,
              clipped_percent: Math.round(p.clipped * 1000) / 10,
              group: p.group,
              best: !!p.best,
              blurry: args.min_sharpness !== undefined ? p.sharpness < args.min_sharpness : undefined,
            }));
            let copied: string[] | undefined;
            if (args.copy_best_to) {
              const keep = photos.filter((p) => (p.group === null || p.group === undefined ? !p.blurry : p.best) && p.path);
              copied = [];
              for (const p of keep) {
                const dst = outputFor(p.path!, path.extname(p.path!).slice(1), '', { output_dir: args.copy_best_to, overwrite: args.overwrite });
                copyFileSync(p.path!, dst);
                copied.push(dst);
              }
            }
            return { success: true, analyzed: photos.length, groups: r?.groups ?? 0, photos: photos.sort((a, b) => b.sharpness - a.sharpness), ...(copied ? { copied } : {}) };
          }),
        );
      } catch (e) {
        return errorResult(e);
      }
    },
  );
}
