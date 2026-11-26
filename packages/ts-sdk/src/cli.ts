#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { formatReport, runDoctor, type DoctorOptions } from "./doctor";
import { loadUncoilEnv, runLogin, type LoginOptions } from "./login";

const HELP = `Usage: uncoil login [options]
       uncoil doctor [options]
       uncoil --version

login   Sign in through your browser and save the API key for this folder.
doctor  Check your API key, region and network, then send one test trace.

login options:
  --region <eu|us>    Data region (default: UNCOIL_REGION, else eu)
  --new <name>        Create a new project with this name
  --no-browser        Only print the address and code; do not open a browser
  --env-file <path>   Where to save the key (default: .env.local)
  --host <url>        Custom host (default: UNCOIL_HOST)
  --json              Print machine-readable lines

doctor options:

  --key <key>       API key (default: UNCOIL_API_KEY)
  --region <eu|us>  Data region (default: UNCOIL_REGION, else from the key)
  --host <url>      Custom host (default: UNCOIL_HOST)
  --no-send         Skip the test trace
  --json            Print the result as JSON
  -h, --help        Show this help
  -v, --version     Print the SDK version

Exit code is 0 when everything passes, 1 when a check fails.`;

/** The installed SDK version, read from the package's own package.json (one level above src/ and dist/). */
export function sdkVersion(): string {
  return (JSON.parse(readFileSync(join(__dirname, "..", "package.json"), "utf8")) as { version: string }).version;
}

/** Picks the command from the first argument. Doctor runs when there is none or only options. */
export function parseCommand(argv: string[]): { command: "login" | "doctor" | "version"; args: string[] } | { error: string } {
  const first = argv[0];
  if (first === "--version" || first === "-v") return { command: "version", args: [] };
  if (first === "login" || first === "doctor") return { command: first, args: argv.slice(1) };
  if (first !== undefined && !first.startsWith("-")) return { error: `Unknown command "${first}". Use "login" or "doctor".` };
  return { command: "doctor", args: argv };
}

async function main(argv: string[]) {
  const parsed = parseCommand(argv);
  if ("error" in parsed) { console.error(parsed.error); return 2; }
  const { command, args } = parsed;
  if (command === "version") { console.log(sdkVersion()); return 0; }
  const options: DoctorOptions & LoginOptions = {};
  let json = false;
  let newProject: string | undefined;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const value = () => {
      const next = args[++i];
      if (!next) { console.error(`Missing value for ${arg}.\n\n${HELP}`); process.exit(2); }
      return next;
    };
    if (arg === "-h" || arg === "--help") { console.log(HELP); return 0; }
    else if (arg === "--key" && command === "doctor") options.apiKey = value();
    else if (arg === "--region") {
      const region = value().toLowerCase();
      if (region !== "eu" && region !== "us") { console.error('--region must be "eu" or "us".'); return 2; }
      options.region = region;
    }
    else if (arg === "--host") options.host = value();
    else if (arg === "--no-send" && command === "doctor") options.send = false;
    else if (arg === "--new" && command === "login") newProject = value();
    else if (arg === "--no-browser" && command === "login") options.browser = false;
    else if (arg === "--env-file" && command === "login") options.envFile = value();
    else if (arg === "--json") json = true;
    else { console.error(`Unknown option ${arg}.\n\n${HELP}`); return 2; }
  }
  if (command === "login") {
    const result = await runLogin({ ...options, newProject, json });
    if (!result.ok) console.error(json ? JSON.stringify({ event: "error", message: result.message }) : result.message);
    return result.ok ? 0 : 1;
  }
  loadUncoilEnv(process.cwd());
  const report = await runDoctor(options);
  console.log(json ? JSON.stringify(report, null, 2) : formatReport(report));
  return report.ok ? 0 : 1;
}

if (require.main === module) main(process.argv.slice(2)).then((code) => { process.exitCode = code; });
