#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const doctor_1 = require("./doctor");
const HELP = `Usage: tracify-sdk doctor [options]

Checks your API key, region and network, then sends one test trace.

  --key <key>       API key (default: TRACIFY_API_KEY)
  --region <eu|us>  Data region (default: TRACIFY_REGION, else from the key)
  --host <url>      Custom host (default: TRACIFY_HOST)
  --no-send         Skip the test trace
  --json            Print the result as JSON
  -h, --help        Show this help

Exit code is 0 when everything passes, 1 when a check fails.`;
async function main(argv) {
    const args = argv[0] === "doctor" ? argv.slice(1) : argv;
    const options = {};
    let json = false;
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        const value = () => {
            const next = args[++i];
            if (!next) {
                console.error(`Missing value for ${arg}.\n\n${HELP}`);
                process.exit(2);
            }
            return next;
        };
        if (arg === "-h" || arg === "--help") {
            console.log(HELP);
            return 0;
        }
        else if (arg === "--key")
            options.apiKey = value();
        else if (arg === "--region") {
            const region = value().toLowerCase();
            if (region !== "eu" && region !== "us") {
                console.error('--region must be "eu" or "us".');
                return 2;
            }
            options.region = region;
        }
        else if (arg === "--host")
            options.host = value();
        else if (arg === "--no-send")
            options.send = false;
        else if (arg === "--json")
            json = true;
        else {
            console.error(`Unknown option ${arg}.\n\n${HELP}`);
            return 2;
        }
    }
    const report = await (0, doctor_1.runDoctor)(options);
    console.log(json ? JSON.stringify(report, null, 2) : (0, doctor_1.formatReport)(report));
    return report.ok ? 0 : 1;
}
main(process.argv.slice(2)).then((code) => { process.exitCode = code; });
