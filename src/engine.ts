import { ChildProcessWithoutNullStreams, execFile, spawn } from 'child_process';
import { constants, copyFileSync, mkdirSync, mkdtempSync, rmSync } from 'fs';
import * as os from 'os';
import * as path from 'path';
import { createInterface } from 'readline';
import { COMMAND_TIMEOUT_SEC, resolveInstall } from './config.js';

/** A LightCraft tool call the engine rejected (unknown command, bad parameters, file problems...). */
export class LightCraftToolError extends Error {
  constructor(
    public readonly tool: string,
    message: string,
  ) {
    super(`${tool}: ${message}`);
    this.name = 'LightCraftToolError';
  }
}

let running = 0;
/** Engine sessions still open (index.ts waits for them before exiting). */
export function pendingRuns(): number {
  return running;
}

export function requireCli(): string {
  const install = resolveInstall();
  if (!install.cli) {
    throw new Error(
      `lightcraft-cli not found (looked in ${install.searched.slice(0, 6).join(', ')} and PATH). Install LightCraft ` +
        '(https://github.com/storytold/lightcraft/releases; on macOS also the lightcraft-cli zip) or set LIGHTCRAFT_DIR / LIGHTCRAFT_CLI.',
    );
  }
  return install.cli;
}

export interface ContentItem {
  type: string;
  text?: string;
  data?: string;
  mimeType?: string;
}

export interface ToolOutput {
  /** The tool's JSON result (structuredContent, or the parsed text). */
  value: any;
  content: ContentItem[];
}

interface RpcResponse {
  result?: { content?: ContentItem[]; structuredContent?: Record<string, any>; isError?: boolean };
  error?: { message: string };
}

interface Pending {
  resolve: (v: RpcResponse) => void;
  reject: (e: Error) => void;
  timer: NodeJS.Timeout;
}

/**
 * One LightCraft engine: `lightcraft-cli mcp --compact` over stdio, a throwaway in-memory library (or, with
 * `connect`, the running app). Photos are imported by reference: develop settings live in the session and the
 * files themselves are only read. Calls are sent one at a time. The session's temporary folder (its working
 * directory and a place for staged copies) is removed when it closes.
 */
export class LightCraftSession {
  private proc: ChildProcessWithoutNullStreams;
  private nextId = 1;
  private pending = new Map<number, Pending>();
  private stderr = '';
  private closed = false;
  readonly workDir: string;
  private counter = 0;
  private queue: Promise<unknown> = Promise.resolve();

  private constructor(cli: string, connect?: string) {
    this.workDir = mkdtempSync(path.join(os.tmpdir(), 'lcmcp-'));
    const args = connect ? ['mcp', '--compact', '--connect', connect] : ['mcp', '--compact'];
    this.proc = spawn(cli, args, { cwd: this.workDir, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    running++;
    this.proc.stderr.setEncoding('utf-8');
    this.proc.stderr.on('data', (d: string) => {
      this.stderr = (this.stderr + d).slice(-4000);
    });
    createInterface({ input: this.proc.stdout }).on('line', (line) => this.onLine(line));
    this.proc.on('error', (e) => this.failAll(e));
    this.proc.on('exit', (code) => this.failAll(new Error(`LightCraft engine exited (code ${code}). ${this.stderr.trim()}`.trim())));
  }

  static async open(connect?: string): Promise<LightCraftSession> {
    const s = new LightCraftSession(requireCli(), connect);
    try {
      await s.rpc('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'lightcraft-mcp-server', version: '1' } });
      s.send({ jsonrpc: '2.0', method: 'notifications/initialized' });
    } catch (e) {
      s.close();
      throw e;
    }
    return s;
  }

  private send(msg: unknown): void {
    this.proc.stdin.write(JSON.stringify(msg) + '\n');
  }

  private onLine(line: string): void {
    let msg: { id?: number } & RpcResponse;
    try {
      msg = JSON.parse(line);
    } catch {
      return;
    }
    if (typeof msg.id !== 'number') return;
    const p = this.pending.get(msg.id);
    if (!p) return;
    this.pending.delete(msg.id);
    clearTimeout(p.timer);
    p.resolve(msg);
  }

  private failAll(e: Error): void {
    for (const p of this.pending.values()) {
      clearTimeout(p.timer);
      p.reject(e);
    }
    this.pending.clear();
    this.finish();
  }

  private finish(): void {
    if (this.closed) return;
    this.closed = true;
    running--;
    try {
      rmSync(this.workDir, { recursive: true, force: true });
    } catch {
      // still locked: the OS temp cleanup takes it later
    }
  }

  private rpc(method: string, params: unknown, timeoutSec = COMMAND_TIMEOUT_SEC): Promise<RpcResponse> {
    const run = () =>
      new Promise<RpcResponse>((resolve, reject) => {
        if (this.closed) return reject(new Error('LightCraft engine is closed.'));
        const id = this.nextId++;
        const timer = setTimeout(() => {
          this.pending.delete(id);
          reject(new Error(`LightCraft engine timed out after ${timeoutSec} s (${method}).`));
        }, timeoutSec * 1000);
        this.pending.set(id, { resolve, reject, timer });
        this.send({ jsonrpc: '2.0', id, method, params });
      });
    const next = this.queue.then(run, run);
    this.queue = next.catch(() => undefined);
    return next;
  }

  /** Call one of the engine's MCP tools (import, set_develop, export, run_command...). */
  async call(tool: string, args: Record<string, unknown> = {}): Promise<ToolOutput> {
    const r = await this.rpc('tools/call', { name: tool, arguments: args });
    if (r.error) throw new LightCraftToolError(tool, r.error.message);
    const result = r.result ?? {};
    const content = result.content ?? [];
    const text = content
      .filter((c) => c.type === 'text')
      .map((c) => c.text ?? '')
      .join('\n')
      .trim();
    if (result.isError) throw new LightCraftToolError(tool, text || 'failed');
    let value: any = result.structuredContent;
    if (value === undefined && text) {
      try {
        value = JSON.parse(text);
      } catch {
        value = { text };
      }
    }
    return { value: value ?? null, content };
  }

  /** The JSON result only. */
  async json<T = any>(tool: string, args: Record<string, unknown> = {}): Promise<T> {
    return (await this.call(tool, args)).value as T;
  }

  /** Run one engine command (see list_commands) and return its JSON result. */
  async cmd<T = any>(id: string, params: Record<string, unknown> = {}): Promise<T> {
    try {
      return await this.json<T>('run_command', { command: id, params });
    } catch (e) {
      if (e instanceof LightCraftToolError) throw new LightCraftToolError(id, e.message.replace(/^run_command: /, ''));
      throw e;
    }
  }

  /** Import files (by reference) and return their photo ids in the same order. */
  async importFiles(files: string[]): Promise<number[]> {
    const ids: number[] = [];
    for (const f of files) {
      const r = await this.json('import', { paths: [f] });
      const id = r?.imported?.[0] ?? r?.duplicates?.[0];
      if (typeof id !== 'number') throw new Error(`LightCraft could not import ${f}${r?.failed?.length ? ': ' + JSON.stringify(r.failed[0]) : ''}.`);
      ids.push(id);
    }
    return ids;
  }

  /** Copy files into the session folder (for commands that write next to their inputs, like merges). */
  stage(files: string[]): string[] {
    const dir = path.join(this.workDir, `in${++this.counter}`);
    mkdirSync(dir, { recursive: true });
    return files.map((f, i) => {
      const dst = path.join(dir, `${String(i).padStart(3, '0')}-${path.basename(f)}`);
      copyFileSync(f, dst, constants.COPYFILE_FICLONE);
      return dst;
    });
  }

  close(): void {
    if (this.closed) return;
    try {
      this.proc.stdin.end();
    } catch {
      // already gone
    }
    const p = this.proc;
    setTimeout(() => {
      if (p.exitCode === null) p.kill();
    }, 2000).unref();
    this.finish();
  }
}

/** Open a session, run fn, always close. */
export async function withSession<T>(fn: (s: LightCraftSession) => Promise<T>, connect?: string): Promise<T> {
  const s = await LightCraftSession.open(connect);
  try {
    return await fn(s);
  } finally {
    s.close();
  }
}

/** One-shot CLI call (--version, commands, controls): stdout as text. */
export function runCli(args: string[], timeoutSec = 120): Promise<string> {
  const cli = requireCli();
  return new Promise((resolve, reject) => {
    const cwd = mkdtempSync(path.join(os.tmpdir(), 'lcmcp-'));
    execFile(
      cli,
      args,
      { cwd, windowsHide: true, timeout: timeoutSec * 1000, maxBuffer: 64 * 1024 * 1024, encoding: 'utf-8' },
      (err, stdout, stderr) => {
        try {
          rmSync(cwd, { recursive: true, force: true });
        } catch {
          // ignore
        }
        if (err) reject(new Error(`lightcraft-cli ${args[0]}: ${(stderr || stdout || err.message).toString().trim()}`));
        else resolve(stdout);
      },
    );
  });
}
