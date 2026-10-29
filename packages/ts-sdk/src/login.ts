import { constants, generateKeyPairSync, privateDecrypt, type KeyObject } from "crypto";
import { spawn } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { UNCOIL_REGION_HOSTS, type UncoilRegion } from "./index";

export interface LoginOptions {
  region?: UncoilRegion;
  host?: string;
  /** Create a project with this name instead of picking one in the browser. */
  newProject?: string;
  /** Do not try to open a browser; only print the address and code. */
  browser?: boolean;
  envFile?: string;
  cwd?: string;
  /** Print machine-readable lines instead of text. */
  json?: boolean;
  /** Test hooks. */
  out?: (line: string) => void;
  sleep?: (ms: number) => Promise<void>;
  open?: (url: string) => void;
  now?: () => number;
}

export interface LoginResult {
  ok: boolean;
  message: string;
  projectId?: string;
  projectName?: string;
  envFile?: string;
}

const KEY_NAME = "UNCOIL_API_KEY";
const PROJECT_ID_NAME = "UNCOIL_PROJECT_ID";
const REGION_NAME = "UNCOIL_REGION";

/** Sets or replaces variables in an env file's text and keeps every other line as it was. */
export function upsertEnv(content: string, vars: Record<string, string | undefined>) {
  const lines = content === "" ? [] : content.replace(/\r\n/g, "\n").split("\n");
  if (lines.length && lines[lines.length - 1] === "") lines.pop();
  for (const [name, value] of Object.entries(vars)) {
    const pattern = new RegExp(`^\\s*(export\\s+)?${name}\\s*=`);
    const index = lines.findIndex((line) => pattern.test(line));
    if (value === undefined) { if (index >= 0) lines.splice(index, 1); continue; }
    const next = `${name}=${value}`;
    if (index >= 0) lines[index] = next; else lines.push(next);
  }
  return `${lines.join("\n")}\n`;
}

/** True when .gitignore text already keeps this file out of git. */
export function gitignoreCovers(content: string, fileName: string) {
  const base = path.basename(fileName);
  const broad = base.startsWith(".env") ? [".env*", ".env.*", ".env*.local", ".env.*.local", "*.local"] : [];
  return content.split(/\r?\n/).map((line) => line.trim().replace(/^\//, "")).some((line) => Boolean(line) && !line.startsWith("#") && !line.startsWith("!") && (line === base || broad.includes(line)));
}

function insideGitRepo(dir: string) {
  for (let current = path.resolve(dir); ; current = path.dirname(current)) {
    if (fs.existsSync(path.join(current, ".git"))) return true;
    if (path.dirname(current) === current) return false;
  }
}

/** Reads UNCOIL_* variables from env files into process.env without overriding values already set. Used by the CLI only. */
export function loadUncoilEnv(cwd: string, files = [".env.local", ".env"]) {
  for (const file of files) {
    let text: string;
    try { text = fs.readFileSync(path.resolve(cwd, file), "utf8"); } catch { continue; }
    for (const line of text.split(/\r?\n/)) {
      const match = /^\s*(?:export\s+)?(UNCOIL_[A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
      if (!match || process.env[match[1]] !== undefined) continue;
      process.env[match[1]] = match[2].replace(/^(["'])(.*)\1$/, "$2");
    }
  }
}

/** Adds the env file to .gitignore when this is a git repo that would otherwise commit the key. Returns true if it changed the file. */
export function ensureGitignored(dir: string, envFile: string) {
  if (!insideGitRepo(dir)) return false;
  const target = path.join(dir, ".gitignore");
  const existing = fs.existsSync(target) ? fs.readFileSync(target, "utf8") : "";
  if (gitignoreCovers(existing, envFile)) return false;
  const prefix = existing === "" || existing.endsWith("\n") ? "" : "\n";
  fs.writeFileSync(target, `${existing}${prefix}${path.basename(envFile)}\n`);
  return true;
}

/** Opens the address in the person's browser. Failure is fine: the address is always printed too. */
function openBrowser(url: string) {
  try {
    const command = process.platform === "win32" ? ["cmd", ["/c", "start", "", url]] as const : process.platform === "darwin" ? ["open", [url]] as const : ["xdg-open", [url]] as const;
    const child = spawn(command[0], [...command[1]], { stdio: "ignore", detached: true });
    child.on("error", () => undefined);
    child.unref();
  } catch { /* the printed address still works */ }
}

export function decryptKey(privateKey: KeyObject, encrypted: string) {
  return privateDecrypt({ key: privateKey, padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: "sha256" }, Buffer.from(encrypted, "base64")).toString("utf8");
}

function loginHost(options: LoginOptions) {
  const envRegion = (process.env.UNCOIL_REGION ?? process.env.TRACIFY_REGION)?.trim().toLowerCase();
  const region = options.region ?? (envRegion === "us" || envRegion === "eu" ? envRegion : "eu");
  return { region, host: (options.host || (process.env.UNCOIL_HOST ?? process.env.TRACIFY_HOST) || UNCOIL_REGION_HOSTS[region]).replace(/\/$/, "") };
}

async function post(url: string, body: unknown) {
  const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(15_000) });
  let data: any = null;
  try { data = await response.json(); } catch { /* not JSON */ }
  return { status: response.status, data };
}

/** Browser sign-in for the terminal. Never prints or logs the key; it is written only to the env file. */
export async function runLogin(options: LoginOptions = {}): Promise<LoginResult> {
  const out = options.out ?? ((line: string) => console.log(line));
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const now = options.now ?? Date.now;
  const cwd = options.cwd ?? process.cwd();
  const envFile = options.envFile ?? ".env.local";
  const { region, host } = loginHost(options);
  const say = (event: string, text: string, extra: Record<string, unknown> = {}) => out(options.json ? JSON.stringify({ event, ...extra, message: text }) : text);

  const nodeMajor = Number(process.versions?.node?.split(".")[0]);
  if (typeof fetch !== "function" || nodeMajor < 18) return { ok: false, message: "Uncoil login needs Node 18 or newer." };

  const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const spki = publicKey.export({ type: "spki", format: "der" }).toString("base64");

  let started;
  try {
    started = await post(`${host}/api/cli/login/start`, { publicKey: spki, newProjectName: options.newProject });
  } catch (error) {
    return { ok: false, message: `Could not reach ${host} (${(error as Error)?.message ?? error}). Check your internet connection.` };
  }
  if (started.status === 429) return { ok: false, message: started.data?.error || "Too many sign-in attempts. Try again in a few minutes." };
  if (started.status !== 200 || !started.data?.deviceCode) return { ok: false, message: started.data?.error || `Uncoil could not start the sign-in (${started.status}).` };

  const { deviceCode, userCode, verificationUrl, expiresAt } = started.data as { deviceCode: string; userCode: string; verificationUrl: string; expiresAt: number };
  const interval = Math.max(2, Number(started.data.interval) || 3) * 1000;
  say("waiting", `Open this page to sign in: ${verificationUrl}\nCode: ${userCode}\nWaiting for you to confirm in the browser…`, { url: verificationUrl, code: userCode, expiresAt });
  if (options.browser !== false) (options.open ?? openBrowser)(verificationUrl);

  let waitMs = interval;
  while (now() < expiresAt + 120_000) {
    await sleep(waitMs);
    let polled;
    try { polled = await post(`${host}/api/cli/login/poll`, { deviceCode }); } catch { continue; }
    if (polled.status === 429) { waitMs = Math.min(waitMs * 2, 15_000); continue; }
    waitMs = interval;
    const status = polled.data?.status;
    if (status === "pending") continue;
    if (status === "denied") return { ok: false, message: "Sign-in was cancelled in the browser." };
    if (status === "expired" || polled.status >= 400) return { ok: false, message: "The sign-in code expired. Run the command again." };
    if (status === "approved") {
      let apiKey: string;
      try { apiKey = decryptKey(privateKey, polled.data.encryptedKey); } catch {
        return { ok: false, message: "Could not read the key Uncoil sent. Run the command again." };
      }
      const target = path.resolve(cwd, envFile);
      const before = fs.existsSync(target) ? fs.readFileSync(target, "utf8") : "";
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, upsertEnv(before, { [KEY_NAME]: apiKey, [PROJECT_ID_NAME]: String(polled.data.projectId), [REGION_NAME]: region === "us" ? "us" : undefined }), { mode: 0o600 });
      const ignored = ensureGitignored(path.dirname(target), envFile);
      const projectName = String(polled.data.projectName ?? "");
      const message = `Connected to project "${projectName}" (${region.toUpperCase()}). Key saved to ${envFile}.${ignored ? ` Added ${path.basename(envFile)} to .gitignore.` : ""}`;
      say("connected", message, { projectId: String(polled.data.projectId), projectName, envFile });
      return { ok: true, message, projectId: String(polled.data.projectId), projectName, envFile };
    }
  }
  return { ok: false, message: "Timed out waiting for the browser. Run the command again." };
}
