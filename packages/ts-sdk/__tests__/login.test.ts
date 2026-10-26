import { constants, generateKeyPairSync, publicEncrypt } from "crypto";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { decryptKey, ensureGitignored, gitignoreCovers, loadTracifyEnv, runLogin, upsertEnv } from "../src/login";
import { runDoctor } from "../src/index";

const dirs: string[] = [];
function tmp() { const d = fs.mkdtempSync(path.join(os.tmpdir(), "tracify-login-")); dirs.push(d); return d; }
afterEach(() => { vi.unstubAllGlobals(); for (const d of dirs.splice(0)) fs.rmSync(d, { recursive: true, force: true }); delete process.env.TRACIFY_PROJECT_ID; });

describe("env file helpers", () => {
  it("adds and replaces values and keeps other lines", () => {
    const first = upsertEnv("A=1\nTRACIFY_API_KEY=old\n", { TRACIFY_API_KEY: "new", TRACIFY_PROJECT_ID: "p1" });
    expect(first).toBe("A=1\nTRACIFY_API_KEY=new\nTRACIFY_PROJECT_ID=p1\n");
    expect(upsertEnv("", { X: "1" })).toBe("X=1\n");
    expect(upsertEnv("TRACIFY_REGION=us\nB=2\n", { TRACIFY_REGION: undefined })).toBe("B=2\n");
  });
  it("recognises ignore rules", () => {
    expect(gitignoreCovers("node_modules\n.env.local\n", ".env.local")).toBe(true);
    expect(gitignoreCovers(".env*\n", ".env.local")).toBe(true);
    expect(gitignoreCovers("# .env.local\nnode_modules\n", ".env.local")).toBe(false);
    expect(gitignoreCovers("*.local\n", "secrets.txt")).toBe(false);
  });
  it("only touches .gitignore inside a git repo", () => {
    const plain = tmp();
    expect(ensureGitignored(plain, ".env.local")).toBe(false);
    expect(fs.existsSync(path.join(plain, ".gitignore"))).toBe(false);
    const repo = tmp(); fs.mkdirSync(path.join(repo, ".git")); fs.writeFileSync(path.join(repo, ".gitignore"), "dist");
    expect(ensureGitignored(repo, ".env.local")).toBe(true);
    expect(fs.readFileSync(path.join(repo, ".gitignore"), "utf8")).toBe("dist\n.env.local\n");
    expect(ensureGitignored(repo, ".env.local")).toBe(false);
  });
  it("loads only TRACIFY_ values and never overrides the environment", () => {
    const dir = tmp();
    fs.writeFileSync(path.join(dir, ".env.local"), 'OTHER=1\nTRACIFY_PROJECT_ID="abc"\nexport TRACIFY_REGION=us\n');
    process.env.TRACIFY_REGION = "eu";
    loadTracifyEnv(dir);
    expect(process.env.TRACIFY_PROJECT_ID).toBe("abc");
    expect(process.env.TRACIFY_REGION).toBe("eu");
    expect(process.env.OTHER).toBeUndefined();
    delete process.env.TRACIFY_REGION;
  });
});

describe("login flow", () => {
  function server(finalStatus: "approved" | "denied" | "expired") {
    const seen: string[] = [];
    let pollCount = 0;
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: any) => {
      const body = init?.body ? JSON.parse(init.body) : {};
      if (url.endsWith("/api/cli/login/start")) {
        seen.push("start");
        (server as any).publicKey = body.publicKey;
        return Response.json({ deviceCode: "d".repeat(43), userCode: "BCDF-GHJK", verificationUrl: "https://eu.cloud.tracify.tech/cli/login?code=BCDF-GHJK", expiresAt: Date.now() + 600_000, interval: 2 });
      }
      pollCount++;
      if (pollCount < 2) return Response.json({ status: "pending" });
      if (finalStatus !== "approved") return Response.json({ status: finalStatus });
      const key = publicEncrypt({ key: Buffer.from((server as any).publicKey, "base64"), format: "der", type: "spki", padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: "sha256" }, Buffer.from("tracify_sk_live_eu_secretsecret"));
      return Response.json({ status: "approved", encryptedKey: key.toString("base64"), projectId: "proj123", projectName: "My agent" });
    }));
    return seen;
  }
  const run = (dir: string, extra: object = {}) => {
    const lines: string[] = [];
    const opened: string[] = [];
    return runLogin({ cwd: dir, out: (l) => lines.push(l), sleep: async () => undefined, open: (u) => opened.push(u), ...extra }).then((result) => ({ result, lines, opened }));
  };

  it("saves the key, project and ignore rule, and never prints the key", async () => {
    server("approved");
    const dir = tmp(); fs.mkdirSync(path.join(dir, ".git"));
    const { result, lines, opened } = await run(dir);
    expect(result.ok).toBe(true);
    expect(result.message).toBe('Connected to project "My agent" (EU). Key saved to .env.local. Added .env.local to .gitignore.');
    expect(fs.readFileSync(path.join(dir, ".env.local"), "utf8")).toBe("TRACIFY_API_KEY=tracify_sk_live_eu_secretsecret\nTRACIFY_PROJECT_ID=proj123\n");
    expect(lines.join("\n")).not.toContain("secretsecret");
    expect(lines[0]).toContain("Open this page to sign in: https://eu.cloud.tracify.tech/cli/login?code=BCDF-GHJK");
    expect(lines[0]).toContain("Code: BCDF-GHJK");
    expect(opened).toHaveLength(1);
  });
  it("does not open a browser with --no-browser", async () => {
    server("approved");
    const { opened } = await run(tmp(), { browser: false });
    expect(opened).toHaveLength(0);
  });
  it("reports cancelled and expired sign-ins without writing a file", async () => {
    for (const status of ["denied", "expired"] as const) {
      server(status);
      const dir = tmp();
      const { result } = await run(dir);
      expect(result.ok).toBe(false);
      expect(fs.existsSync(path.join(dir, ".env.local"))).toBe(false);
    }
  });
  it("prints JSON events with --json", async () => {
    server("approved");
    const { lines } = await run(tmp(), { json: true });
    expect(JSON.parse(lines[0])).toMatchObject({ event: "waiting", code: "BCDF-GHJK" });
    expect(JSON.parse(lines[1])).toMatchObject({ event: "connected", projectId: "proj123" });
  });
  it("decrypts only with the matching private key", () => {
    const a = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const b = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const sealed = publicEncrypt({ key: a.publicKey, padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: "sha256" }, Buffer.from("k")).toString("base64");
    expect(decryptKey(a.privateKey, sealed)).toBe("k");
    expect(() => decryptKey(b.privateKey, sealed)).toThrow();
  });
});

describe("doctor project check", () => {
  const KEY = "tracify_sk_live_eu_abcdefghijklmnop";
  function stub(projectId: string) {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => url.endsWith("/api/sdk/whoami") ? Response.json({ projectId, projectName: "My agent" }) : url.endsWith("/api/ingest") ? new Response("{}", { status: 202 }) : new Response("<html>")));
  }
  it("says where traces will land", async () => {
    stub("proj123");
    const report = await runDoctor({ apiKey: KEY, send: false });
    expect(report.checks.find((c) => c.id === "project")).toMatchObject({ status: "ok", message: "Traces will land in: My agent" });
  });
  it("fails when the saved project id belongs to another project", async () => {
    stub("proj123");
    process.env.TRACIFY_PROJECT_ID = "other";
    const report = await runDoctor({ apiKey: KEY });
    expect(report.ok).toBe(false);
    expect(report.checks.at(-1)?.id).toBe("project");
  });
});
