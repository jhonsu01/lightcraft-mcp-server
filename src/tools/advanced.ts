import { execFile, spawn } from 'child_process';
import { mkdirSync } from 'fs';
import * as net from 'net';
import * as path from 'path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { COMMAND_TIMEOUT_SEC, CONTROL_PORT, connectorDir, resolveInstall } from '../config.js';
import { runCli, withSession } from '../engine.js';
import { READ, READABLE, WRITABLE, collectInputs, errorResult, exportAll, exportSchema, formatOfPath, json, preview, withPreview } from './common.js';

interface CommandDef {
  id: string;
  label: string;
  menu?: string[];
  params: string | null;
}
interface ControlDef {
  id: string;
  label: string;
  section: string;
  min: number;
  max: number;
  default: number;
}

let commandCache: CommandDef[] | undefined;
async function engineCommands(): Promise<CommandDef[]> {
  if (!commandCache) commandCache = JSON.parse(await runCli(['commands', '--json'])) as CommandDef[];
  return commandCache;
}
let controlCache: ControlDef[] | undefined;
async function engineControls(): Promise<ControlDef[]> {
  if (!controlCache) controlCache = JSON.parse(await runCli(['controls', '--json'])) as ControlDef[];
  return controlCache;
}

export function controlPortOpen(port = CONTROL_PORT, timeoutMs = 800): Promise<boolean> {
  return new Promise((resolve) => {
    const sock = net.connect({ host: '127.0.0.1', port });
    const done = (ok: boolean) => {
      sock.destroy();
      resolve(ok);
    };
    sock.setTimeout(timeoutMs, () => done(false));
    sock.once('connect', () => done(true));
    sock.once('error', () => done(false));
  });
}

function appRunning(): Promise<boolean> {
  return new Promise((resolve) => {
    if (process.platform === 'win32') {
      execFile('tasklist', ['/FI', 'IMAGENAME eq lightcraft.exe', '/NH'], { windowsHide: true }, (err, out) => resolve(!err && /lightcraft\.exe/i.test(out)));
    } else {
      // exact process name: never matches our own lightcraft-cli engines
      execFile('pgrep', ['-xi', 'lightcraft'], (err, out) => resolve(!err && out.trim().length > 0));
    }
  });
}

/**
 * Replace "$steps[N].path.to[0]" with a value returned by step N (0-based), e.g. "$steps[0].activeMask".
 */
export function substitute(value: unknown, steps: unknown[] = []): unknown {
  if (typeof value === 'string') {
    const st = /^\$steps\[(\d+)\]((?:\.[A-Za-z_]\w*|\[\d+\])*)$/.exec(value);
    if (st) {
      let cur: unknown = steps[Number(st[1])];
      for (const part of st[2].match(/\.[A-Za-z_]\w*|\[\d+\]/g) ?? []) {
        const key = part.startsWith('.') ? part.slice(1) : Number(part.slice(1, -1));
        cur = cur && typeof cur === 'object' ? (cur as Record<string | number, unknown>)[key] : undefined;
      }
      if (cur === undefined) throw new Error(`${value} is not available (step results so far: ${steps.length}).`);
      return cur;
    }
    return value;
  }
  if (Array.isArray(value)) return value.map((v) => substitute(v, steps));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, substitute(v, steps)]));
  return value;
}

export function registerAdvancedTools(server: McpServer): void {
  server.registerTool(
    'list_lightcraft_catalog',
    {
      title: 'List controls, presets, profiles, commands',
      description:
        'What LightCraft can do: controls (114 develop sliders with id, section, range and default — for develop_photos values), ' +
        'presets (develop presets by group), profiles (looks: Color, Vivid, Portrait, film, cinematic... and imported LUTs), ' +
        'curve_presets, export_presets, commands (240 engine commands with parameters, for run_lightcraft_commands), formats.',
      inputSchema: {
        kind: z.enum(['controls', 'presets', 'profiles', 'curve_presets', 'export_presets', 'commands', 'formats']),
        filter: z.string().optional().describe('Case-insensitive text to match.'),
      },
      annotations: READ,
    },
    async (args) => {
      try {
        const f = (args.filter ?? '').toLowerCase();
        const match = (...parts: unknown[]) => !f || parts.some((p) => String(p ?? '').toLowerCase().includes(f));
        if (args.kind === 'formats') return json({ success: true, readable: READABLE, writable: Object.keys(WRITABLE) });
        if (args.kind === 'commands') {
          const l = (await engineCommands()).filter((c) => match(c.id, c.label, (c.menu ?? []).join(' ')));
          return json({ success: true, count: l.length, commands: l.map((c) => ({ id: c.id, label: c.label, params: c.params })) });
        }
        if (args.kind === 'controls') {
          const l = (await engineControls()).filter((c) => match(c.id, c.label, c.section));
          return json({ success: true, count: l.length, controls: l.map((c) => ({ id: c.id, label: c.label, section: c.section, min: c.min, max: c.max, default: c.default })) });
        }
        return json(
          await withSession(async (s) => {
            if (args.kind === 'presets' || args.kind === 'profiles') {
              const l = ((await s.cmd(args.kind === 'presets' ? 'presets.list' : 'profiles.list')) ?? []) as any[];
              const groups: Record<string, { id: string; name: string }[]> = {};
              for (const p of l.filter((p) => match(p.id, p.name, p.group))) (groups[p.group ?? 'Other'] ??= []).push({ id: p.id, name: p.name });
              return { success: true, count: Object.values(groups).flat().length, groups };
            }
            if (args.kind === 'curve_presets') {
              const r = await s.cmd('curve.presets');
              return { success: true, presets: ((r?.presets ?? []) as any[]).filter((p) => match(p.name)).map((p) => ({ name: p.name, master: p.master })) };
            }
            const r = ((await s.cmd('export.presets')) ?? []) as any[];
            return { success: true, presets: r.filter((p) => match(p.name)) };
          }),
        );
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  server.registerTool(
    'run_lightcraft_commands',
    {
      title: 'Run LightCraft engine commands',
      description:
        'Advanced: import photos (or use the open app with live=true) and run any of LightCraft\'s 240 engine commands in order in ' +
        'one session — develop.*, mask.*, spot.*, crop.*, preset.*, curve.*, photo.* (rating, flags, metadata, keywords, rename...), ' +
        'library.*, version.*, history.*. Commands act on the active photo; the first imported photo is active, and photo_ids in ' +
        'the result map paths to ids (select another with photo.* ids or develop.* ids params). Parameters can use "$steps[N].field" ' +
        'for a value returned by step N (0-based). Then export photos to the given files. live=true drives the open LightCraft app ' +
        '(open_in_lightcraft control=true) and its library.',
      inputSchema: {
        paths: z.array(z.string()).max(500).default([]).describe('Absolute photos to import first (ids 1, 2, ... in a headless session).'),
        steps: z.array(z.object({ id: z.string(), params: z.record(z.string(), z.any()).optional() })).max(500).default([]),
        stop_on_error: z.boolean().default(true),
        exports: z
          .array(z.object({ path: z.string().describe('Absolute file; its extension picks the format.'), photo: z.number().int().optional().describe('Photo id (default: the active one).') }))
          .optional(),
        ...exportSchema,
        overwrite: z.boolean().default(false),
        preview: z.boolean().default(false),
        live: z.boolean().default(false).describe(`Drive the running LightCraft app (control port ${CONTROL_PORT}).`),
      },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
    },
    async (args) => {
      try {
        const files = args.paths.length ? collectInputs(args.paths) : [];
        if (args.live && !(await controlPortOpen())) throw new Error(`LightCraft is not listening on port ${CONTROL_PORT}: call open_in_lightcraft with control=true first.`);
        return await withSession(
          async (s) => {
            const ids = files.length ? await s.importFiles(files) : [];
            const values: unknown[] = [];
            const results: Record<string, unknown>[] = [];
            let failed = 0;
            for (const step of args.steps) {
              try {
                const out = await s.cmd(step.id, substitute(step.params ?? {}, values) as Record<string, unknown>);
                values.push(out);
                results.push({ id: step.id, ok: true, result: out });
              } catch (e) {
                failed++;
                values.push(undefined);
                results.push({ id: step.id, ok: false, error: e instanceof Error ? e.message : String(e) });
                if (args.stop_on_error) break;
              }
            }
            const exported: unknown[] = [];
            if ((failed === 0 || !args.stop_on_error) && args.exports?.length) {
              for (const ex of args.exports) {
                const format = formatOfPath(ex.path);
                if (!format) throw new Error(`Can't write ${ex.path}: unknown extension.`);
                const id = ex.photo ?? ids[0];
                if (id === undefined) throw new Error('exports need a photo id (no photo was imported).');
                exported.push(...(await exportAll(s, id, { input: ex.path + '.__src', suffix: '', output_path: ex.path, overwrite: args.overwrite }, [format], args)));
              }
            }
            const activeId = args.exports?.[0]?.photo ?? ids[0];
            const body = { success: failed === 0, ...(ids.length ? { photo_ids: ids } : {}), completed: results.length - failed, failed, results, ...(exported.length ? { exported } : {}) };
            return withPreview(body, args.preview && activeId !== undefined ? await preview(s, activeId, 1024) : undefined, failed > 0);
          },
          args.live ? `127.0.0.1:${CONTROL_PORT}` : undefined,
        );
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  server.registerTool(
    'open_in_lightcraft',
    {
      title: 'Open in LightCraft',
      description:
        'Open photos in the LightCraft desktop app (they are imported into its library, by reference) for manual editing. With ' +
        'control=true the app also starts its loopback-only control channel so run_lightcraft_commands live=true can drive it.',
      inputSchema: {
        paths: z.array(z.string()).max(500).default([]).describe('Absolute photos or folders.'),
        control: z.boolean().default(false),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    },
    async (args) => {
      try {
        for (const p of args.paths) if (!path.isAbsolute(p)) throw new Error(`Paths must be absolute: ${p}`);
        const install = resolveInstall();
        if (!install.app) throw new Error('LightCraft desktop app not found. Set LIGHTCRAFT_DIR (or LIGHTCRAFT_APP for an AppImage).');
        const extra = args.control && !(await controlPortOpen()) ? ['--control', String(CONTROL_PORT)] : [];
        // run it from this connector's folder: GPU drivers drop log folders into the working directory
        const cwd = connectorDir();
        mkdirSync(cwd, { recursive: true });
        const child = spawn(install.app, [...extra, ...args.paths], { cwd, detached: true, stdio: 'ignore', windowsHide: false });
        child.on('error', () => undefined);
        child.unref();
        let listening: boolean | undefined;
        if (extra.length) {
          const deadline = Date.now() + 20_000;
          while (!(listening = await controlPortOpen()) && Date.now() < deadline) await new Promise((r) => setTimeout(r, 500));
          if (!listening) throw new Error(`LightCraft started but is not listening on port ${CONTROL_PORT} after 20 s (it may have closed). Start it by hand with: lightcraft --control ${CONTROL_PORT}`);
        }
        return json({ success: true, app: install.app, opened: args.paths, ...(extra.length ? { control_port: CONTROL_PORT, listening } : {}) });
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  server.registerTool(
    'get_lightcraft_status',
    {
      title: 'LightCraft status',
      description: 'Check the LightCraft installation: platform, executables, version, commands and develop controls, whether the app is running / listening for control, formats.',
      inputSchema: {},
      annotations: READ,
    },
    async () => {
      const install = resolveInstall();
      const status: Record<string, unknown> = {
        ready: !!install.cli,
        platform: `${install.platform} ${process.arch}`,
        install_dir: install.dir,
        cli: install.cli ?? null,
        app: install.app ?? null,
      };
      try {
        if (!install.cli) throw new Error(`lightcraft-cli not found (searched ${install.searched.length} folders). Install LightCraft or set LIGHTCRAFT_DIR / LIGHTCRAFT_CLI.`);
        status['version'] = (await runCli(['--version'])).split('\n')[0].trim();
        status['commands'] = (await engineCommands()).length;
        status['controls'] = (await engineControls()).length;
        status['app_running'] = await appRunning();
        status['control_port'] = CONTROL_PORT;
        status['control_listening'] = await controlPortOpen();
        status['readable'] = READABLE;
        status['writable'] = Object.keys(WRITABLE);
        status['timeout_sec'] = COMMAND_TIMEOUT_SEC;
        return json(status);
      } catch (e) {
        return json({ ...status, ready: false, error: e instanceof Error ? e.message : String(e) }, true);
      }
    },
  );
}
