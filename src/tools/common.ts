import { existsSync, mkdirSync, readdirSync, statSync } from 'fs';
import * as path from 'path';
import { z } from 'zod';
import { LightCraftSession } from '../engine.js';
import { resolveOutputPath, stemOf } from '../paths.js';

export type Content = { type: 'text'; text: string } | { type: 'image'; data: string; mimeType: string };
export type ToolResult = { content: Content[]; isError?: boolean };

export function json(obj: unknown, isError = false): ToolResult {
  const out: ToolResult = { content: [{ type: 'text', text: JSON.stringify(obj, null, 2) }] };
  if (isError) out.isError = true;
  return out;
}

export function errorResult(e: unknown): ToolResult {
  return json({ success: false, error: e instanceof Error ? e.message : String(e) }, true);
}

export const WRITE = { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false } as const;
export const READ = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false } as const;

// ---------------------------------------------------------------- formats

/** Raw formats LightCraft decodes (or shows from their embedded preview). */
export const RAW = ['dng', 'cr2', 'cr3', 'arw', 'nef', 'raf', 'rw2', 'rwl', 'raw', 'pef', 'orf', 'srw'];
/** What LightCraft imports (README › Formats). */
export const READABLE = [...RAW, 'jpg', 'jpeg', 'png', 'tif', 'tiff', 'webp', 'psd', 'jxl', 'heic', 'heif', 'avif'];

/** Export formats: id → file extension ("original" copies the file and writes an XMP sidecar). */
export const WRITABLE = {
  jpg: 'jpg',
  png: 'png',
  tiff: 'tif',
  webp: 'webp',
  avif: 'avif',
  dng: 'dng',
  original: '',
} as const;
export type WritableFormat = keyof typeof WRITABLE;
export const WRITABLE_IDS = Object.keys(WRITABLE) as [WritableFormat, ...WritableFormat[]];
const ENGINE_FORMAT: Record<WritableFormat, string> = { jpg: 'jpeg', png: 'png', tiff: 'tiff', webp: 'webp', avif: 'avif', dng: 'dng', original: 'original' };

export const formatsSchema = z
  .array(z.enum(WRITABLE_IDS))
  .min(1)
  .max(7)
  .describe('Output formats: jpg, png, tiff, webp, avif, dng (raw inputs only, edits embedded), original (a copy of the file plus an XMP sidecar with the edits). Default jpg.');

// ---------------------------------------------------------------- schemas

export const inputsSchema = {
  input_path: z.string().optional().describe('Absolute path of one photo (raw, JPEG, TIFF, PNG, WebP, HEIC...).'),
  input_paths: z.array(z.string()).max(2000).optional().describe('Absolute paths of several photos.'),
  input_dir: z.string().optional().describe('Absolute folder: every photo directly inside it (non-recursive).'),
};

export const exportSchema = {
  long_edge: z.number().int().min(0).optional().describe('Long edge in px (default: full size).'),
  short_edge: z.number().int().positive().optional(),
  width: z.number().int().positive().optional().describe('With height: fit inside width × height.'),
  height: z.number().int().positive().optional(),
  percent: z.number().positive().max(100).optional().describe('Size as % of full size.'),
  megapixels: z.number().positive().optional(),
  quality: z.number().int().min(1).max(100).optional().describe('JPEG / AVIF quality (default 92).'),
  limit_kb: z.number().int().positive().optional().describe('JPEG: the best quality that fits this many KB.'),
  color_space: z.enum(['srgb', 'displayP3', 'adobeRgb', 'proPhoto', 'rec2020']).optional().describe('Default sRGB.'),
  bit_depth: z.union([z.literal(8), z.literal(10), z.literal(16), z.literal(32)]).optional().describe('PNG 8|16, TIFF 8|16|32, AVIF 8|10.'),
  output_sharpening: z.enum(['none', 'screen', 'matte', 'glossy']).optional(),
  metadata: z.enum(['all', 'allExceptCamera', 'copyright', 'none']).optional().describe('Metadata kept in the file (default all).'),
  remove_location: z.boolean().optional().describe('Strip GPS.'),
  watermark: z
    .union([
      z.string(),
      z.object({
        text: z.string(),
        size: z.number().positive().max(1).optional().describe('Fraction of the short edge.'),
        opacity: z.number().min(0).max(100).optional(),
        anchor: z.enum(['topLeft', 'top', 'topRight', 'left', 'center', 'right', 'bottomLeft', 'bottom', 'bottomRight']).optional(),
        color: z.array(z.number().int().min(0).max(255)).length(3).optional().describe('[r, g, b].'),
      }),
    ])
    .optional()
    .describe('Text watermark: a string, or {text, size, opacity, anchor, color}.'),
  ppi: z.number().int().positive().optional(),
};
export type ExportOpts = { [K in keyof typeof exportSchema]?: z.infer<(typeof exportSchema)[K]> };

export const outputSchema = {
  output_path: z.string().optional().describe('Absolute output file (single input; its extension must be one of formats).'),
  output_dir: z.string().optional().describe('Absolute output folder (default: next to each input).'),
  overwrite: z.boolean().default(false).describe('Replace existing output files.'),
};

// ---------------------------------------------------------------- inputs

/** Absolute, existing files from explicit paths plus every photo directly inside dir. */
export function collectInputs(paths: string[], dir?: string, exts = READABLE): string[] {
  const out: string[] = [];
  for (const p of paths) {
    if (!path.isAbsolute(p)) throw new Error(`Paths must be absolute: ${p}`);
    if (!existsSync(p) || !statSync(p).isFile()) throw new Error(`File not found: ${p}`);
    out.push(p);
  }
  if (dir) {
    if (!path.isAbsolute(dir)) throw new Error(`input_dir must be an absolute path: ${dir}`);
    if (!existsSync(dir) || !statSync(dir).isDirectory()) throw new Error(`Folder not found: ${dir}`);
    for (const name of readdirSync(dir).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))) {
      const full = path.join(dir, name);
      if (exts.includes(path.extname(name).slice(1).toLowerCase()) && statSync(full).isFile()) out.push(full);
    }
  }
  if (out.length === 0) throw new Error('No input files: give input_path, input_paths or input_dir.');
  return out;
}

export function inputsOf(a: { input_path?: string; input_paths?: string[]; input_dir?: string }, exts = READABLE): string[] {
  return collectInputs([...(a.input_path ? [a.input_path] : []), ...(a.input_paths ?? [])], a.input_dir, exts);
}

/** Decide where a result goes (never overwriting unless asked). */
export function outputFor(
  input: string,
  ext: string,
  suffix: string,
  o: { output_path?: string; output_dir?: string; overwrite?: boolean },
): string {
  if (o.output_dir) mkdirSync(o.output_dir, { recursive: true });
  const r = resolveOutputPath({ inputPath: input, ext, suffix, outputPath: o.output_path, outputDir: o.output_dir, overwrite: o.overwrite });
  if ('error' in r) throw new Error(r.error);
  mkdirSync(path.dirname(r.path), { recursive: true });
  return r.path;
}

/** The format a path's extension asks for. */
export function formatOfPath(p: string): WritableFormat | undefined {
  const e = path.extname(p).slice(1).toLowerCase();
  const map: Record<string, WritableFormat> = { jpeg: 'jpg', jpe: 'jpg', tif: 'tiff' };
  const f = (map[e] ?? e) as WritableFormat;
  return f in WRITABLE && f !== 'original' ? f : undefined;
}

export function isRaw(p: string): boolean {
  return RAW.includes(path.extname(p).slice(1).toLowerCase());
}

// ---------------------------------------------------------------- engine helpers

/** Export options in the engine's names; no size given = full size (the engine's own default is 3000 px). */
export function engineExportOptions(o: ExportOpts): Record<string, unknown> {
  const p: Record<string, unknown> = {};
  const sized = ['long_edge', 'short_edge', 'width', 'height', 'percent', 'megapixels'].some((k) => o[k as keyof ExportOpts] !== undefined);
  if (!sized) p['longEdge'] = 0;
  if (o.long_edge !== undefined) p['longEdge'] = o.long_edge;
  if (o.short_edge) p['shortEdge'] = o.short_edge;
  if (o.width) p['width'] = o.width;
  if (o.height) p['height'] = o.height;
  if (o.percent) p['percent'] = o.percent;
  if (o.megapixels) p['megapixels'] = o.megapixels;
  if (o.quality) p['quality'] = o.quality;
  if (o.limit_kb) p['limitKb'] = o.limit_kb;
  if (o.color_space) p['colorSpace'] = o.color_space;
  if (o.bit_depth) p['bitDepth'] = o.bit_depth;
  if (o.output_sharpening) p['sharpen'] = o.output_sharpening;
  if (o.metadata) p['metadata'] = o.metadata;
  if (o.remove_location) p['removeLocation'] = true;
  if (o.ppi) p['ppi'] = o.ppi;
  if (o.watermark !== undefined) {
    const w = o.watermark;
    p['watermark'] = typeof w === 'string' ? w : { ...w, ...(w.opacity !== undefined ? { opacity: w.opacity / 100 } : {}) };
  }
  return p;
}

export interface Saved {
  path: string;
  format: string;
  bytes: number;
  width?: number;
  height?: number;
  sidecars?: string[];
}

/**
 * Export photo `id` once per format: output_path for the format matching its extension, the others as
 * <output_dir or input folder>/<stem><suffix>.<ext>, never replacing anything unless overwrite.
 */
export async function exportAll(
  s: LightCraftSession,
  id: number,
  base: { input: string; suffix: string; output_dir?: string; output_path?: string; overwrite?: boolean },
  formats: WritableFormat[],
  o: ExportOpts,
): Promise<Saved[]> {
  const out: Saved[] = [];
  const named = base.output_path ? formatOfPath(base.output_path) : undefined;
  if (base.output_path && !named) throw new Error(`output_path has an extension LightCraft can't write: ${base.output_path}`);
  const opts = engineExportOptions(o);
  for (const f of formats) {
    if (f === 'dng' && !isRaw(base.input)) throw new Error(`DNG export needs a raw photo; ${path.basename(base.input)} is not one.`);
    // "original" keeps the input's own extension
    const ext = f === 'original' ? path.extname(base.input).slice(1) : WRITABLE[f];
    const target =
      named === f
        ? outputFor(base.output_path + '.__src', ext, '', { output_path: base.output_path, overwrite: base.overwrite })
        : outputFor(base.output_path ? path.join(path.dirname(base.output_path), stemOf(base.output_path) + '.__src') : base.input, ext, base.output_path ? '' : base.suffix, {
            output_dir: base.output_dir ?? (base.output_path ? path.dirname(base.output_path) : undefined),
            overwrite: base.overwrite,
          });
    const r = await s.json('export', { id, path: target, format: ENGINE_FORMAT[f], ...(f === 'dng' || f === 'original' ? {} : opts) });
    const file = r?.files?.[0] ?? r;
    out.push({ path: file.path ?? target, format: f, bytes: file.bytes, width: file.width, height: file.height, ...(file.sidecars?.length ? { sidecars: file.sidecars } : {}) });
  }
  return out;
}

/** Rendered preview of photo `id` (current settings, cropped), returned as an MCP image. */
export async function preview(s: LightCraftSession, id: number, size = 1024): Promise<{ data: string; mimeType: string } | undefined> {
  const r = await s.call('render_photo', { id, size: Math.min(4096, Math.max(64, Math.round(size))), format: 'jpeg' });
  const img = r.content.find((c) => c.type === 'image');
  return img?.data ? { data: img.data, mimeType: img.mimeType ?? 'image/jpeg' } : undefined;
}

export function withPreview(body: unknown, img: { data: string; mimeType: string } | undefined, isError = false): ToolResult {
  const res = json(body, isError);
  if (img) res.content.push({ type: 'image', ...img });
  return res;
}

export { stemOf };
