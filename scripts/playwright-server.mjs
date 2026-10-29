import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const port = process.env.PLAYWRIGHT_PORT ?? "3100";
const nextBin = fileURLToPath(new URL("../node_modules/next/dist/bin/next", import.meta.url));
const child = spawn(process.execPath, [nextBin, "start", "-p", port], {
  env: {
    ...process.env,
    PLAYWRIGHT_LOCAL_SERVER: "1",
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL ?? "https://eu.cloud.uncoil.dev",
    NEXT_PUBLIC_CONVEX_URL: process.env.NEXT_PUBLIC_CONVEX_URL ?? "https://jovial-owl-711.eu-west-1.convex.cloud",
    NEXT_PUBLIC_CONVEX_SITE_URL: process.env.NEXT_PUBLIC_CONVEX_SITE_URL ?? "https://jovial-owl-711.eu-west-1.convex.site",
  },
  stdio: "inherit",
  windowsVerbatimArguments: false,
});

const forward = (signal) => child.kill(signal);
process.on("SIGINT", () => forward("SIGINT"));
process.on("SIGTERM", () => forward("SIGTERM"));
child.on("exit", (code, signal) => process.exit(code ?? (signal ? 1 : 0)));
