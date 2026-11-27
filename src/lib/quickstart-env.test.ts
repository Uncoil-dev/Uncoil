import { describe, expect, it } from "vitest";

import { keyEnvLines } from "./quickstart-env";

describe("keyEnvLines", () => {
  it("writes the key and region as .env lines", () => {
    expect(keyEnvLines("uncoil_sk_live_eu_abc", "eu").dotenv).toBe("UNCOIL_API_KEY=uncoil_sk_live_eu_abc\nUNCOIL_REGION=eu");
  });

  it("writes the same values as PowerShell environment variables", () => {
    expect(keyEnvLines("uncoil_sk_live_us_abc", "us").powershell).toBe('$env:UNCOIL_API_KEY="uncoil_sk_live_us_abc"\n$env:UNCOIL_REGION="us"');
  });
});
