/**
 * Run one Uncoil host locally, mirroring how production is split.
 *
 * Production serves two different applications from this one codebase:
 * www.uncoil.dev (marketing) and eu.cloud.uncoil.dev (the cloud app).
 * Which one you get is decided by NEXT_PUBLIC_UNCOIL_DEPLOYMENT_KIND, so a
 * single dev server can only ever be one of them — and a `cloud` server
 * redirects all marketing routes away, while a `marketing` server redirects
 * /dashboard to the region selector.
 *
 * This runs them side by side:
 *   npm run dev:marketing   -> http://localhost:3000  (marketing)
 *   npm run dev:cloud       -> http://localhost:4000  (EU cloud app)
 *
 * Next refuses two dev instances sharing a build directory, so the cloud host
 * uses NEXT_DIST_DIR=.next-cloud. Values set here take precedence over
 * .env.local, so no env file edits are needed to switch between them.
 */
import { spawn } from "node:child_process";

const HOSTS = {
  marketing: {
    port: 3000,
    env: {
      NEXT_PUBLIC_UNCOIL_DEPLOYMENT_KIND: "marketing",
      NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
    },
  },
  cloud: {
    port: 4000,
    env: {
      NEXT_DIST_DIR: ".next-cloud",
      NEXT_PUBLIC_UNCOIL_DEPLOYMENT_KIND: "cloud",
      NEXT_PUBLIC_UNCOIL_REGION: "eu",
      UNCOIL_REGION: "eu",
      NEXT_PUBLIC_SITE_URL: "http://localhost:4000",
    },
  },
};

const which = process.argv[2];
const host = HOSTS[which];
if (!host) {
  console.error(`Usage: node scripts/dev-host.mjs <${Object.keys(HOSTS).join("|")}>`);
  process.exit(2);
}

console.log(`Starting the ${which} host on http://localhost:${host.port}`);
const child = spawn(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["next", "dev", "-p", String(host.port)],
  { stdio: "inherit", env: { ...process.env, ...host.env }, shell: process.platform === "win32" },
);
child.on("exit", (code) => process.exit(code ?? 0));
