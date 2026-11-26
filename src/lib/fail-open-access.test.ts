import { beforeEach, describe, expect, it } from "vitest";
import { denyFailOpenAccess } from "./fail-open-access";

let keyOwner: string | null;
let sessionDenial: Response | null;
const deps = {
  projectIdForKey: async () => keyOwner,
  denySession: async () => sessionDenial,
};

describe("denyFailOpenAccess", () => {
  beforeEach(() => {
    keyOwner = null;
    sessionDenial = null;
  });

  it("rejects a bearer token that is not a valid API key", async () => {
    expect((await denyFailOpenAccess("Bearer not-a-real-key", "p1", deps))?.status).toBe(401);
  });

  it("rejects an API key that matches no project", async () => {
    expect((await denyFailOpenAccess("Bearer uncoil_sk_live_unknown", "p1", deps))?.status).toBe(401);
  });

  it("hides another project's data from a key that belongs elsewhere", async () => {
    keyOwner = "p2";
    expect((await denyFailOpenAccess("Bearer uncoil_sk_live_other", "p1", deps))?.status).toBe(404);
  });

  it("allows a key that belongs to the project", async () => {
    keyOwner = "p1";
    expect(await denyFailOpenAccess("Bearer uncoil_sk_live_mine", "p1", deps)).toBeNull();
  });

  it("falls back to the session check when no key is sent", async () => {
    sessionDenial = Response.json({ error: "Unauthorized" }, { status: 401 });
    expect((await denyFailOpenAccess(null, "p1", deps))?.status).toBe(401);
    sessionDenial = null;
    expect(await denyFailOpenAccess(null, "p1", deps)).toBeNull();
  });
});
