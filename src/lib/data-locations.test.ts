import { describe, expect, it } from "vitest";

import { BACKUP_DAYS, TRACE_STORE_LOCATION, dataLocations, retentionRows } from "./data-locations";

describe("dataLocations", () => {
  it("has entries", () => {
    expect(dataLocations.length).toBeGreaterThan(0);
  });

  it("has no empty required fields", () => {
    for (const entry of dataLocations) {
      for (const key of ["what", "where", "place", "note"] as const) {
        expect(entry[key].trim(), `${entry.what}.${key}`).not.toBe("");
      }
    }
  });

  it("uses only known eu values", () => {
    for (const entry of dataLocations) {
      expect(["yes", "no", "own"]).toContain(entry.eu);
    }
  });

  it("has no duplicate entries", () => {
    const whats = dataLocations.map((e) => e.what.toLowerCase());
    expect(new Set(whats).size).toBe(whats.length);
    const pairs = dataLocations.map((e) => `${e.where}|${e.place}`.toLowerCase());
    expect(new Set(pairs).size).toBe(pairs.length);
  });

  it("falls back to a non-empty place for the trace store", () => {
    const trace = dataLocations.find((e) => e.eu === "own");
    expect(trace).toBeDefined();
    expect(trace?.place).toBe(TRACE_STORE_LOCATION ?? "A server we run, not a shared cloud");
    if (TRACE_STORE_LOCATION !== null) expect(TRACE_STORE_LOCATION.trim()).not.toBe("");
  });

  it("mentions the backup retention window in the backup note", () => {
    const backup = dataLocations.find((e) => e.where === "Cloudflare R2");
    expect(backup?.note).toContain(`${BACKUP_DAYS} days`);
  });
});

describe("numeric constants", () => {
  it("has a sane backup window", () => {
    expect(Number.isInteger(BACKUP_DAYS)).toBe(true);
    expect(BACKUP_DAYS).toBeGreaterThan(0);
    expect(BACKUP_DAYS).toBeLessThanOrEqual(365);
  });

  it("lists each plan once with positive whole-day retention", () => {
    const names = retentionRows.map(([name]) => name);
    expect(new Set(names).size).toBe(names.length);
    for (const [name, days] of retentionRows) {
      expect(name.trim()).not.toBe("");
      expect(Number.isInteger(days), name).toBe(true);
      expect(days, name).toBeGreaterThan(0);
    }
  });

  it("never shortens retention on higher plans", () => {
    const days = retentionRows.map(([, d]) => d);
    expect(days).toEqual([...days].sort((a, b) => a - b));
  });
});
