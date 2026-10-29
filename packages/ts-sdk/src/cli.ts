#!/usr/bin/env node
import { formatReport, runDoctor, type DoctorOptions } from "./doctor";
import { loadUncoilEnv, runLogin, type LoginOptions } from "./login";

const HELP = `Usage: uncoil-sdk login [options]
       uncoil-sdk doctor [options]

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

Exit code is 0 when everything passes, 1 when a check fails.`;

async function main(argv: string[]) {
  const command = argv[0] === "login" || argv[0] === "doctor" ? argv[0] : "doctor";
  const args = argv[0] === "login" || argv[0] === "doctor" ? argv.slice(1) : argv;
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

main(process.argv.slice(2)).then((code) => { process.exitCode = code; });
