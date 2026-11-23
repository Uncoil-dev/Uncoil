import assert from "node:assert/strict";
import { register } from "node:module";
import test from "node:test";

// The dictionaries import "@/lib/app-links" and extensionless relative modules,
// which plain Node cannot resolve. A resolve hook stubs the alias and maps
// relative specifiers to their .ts files.
const hooks = `
  export async function resolve(specifier, context, next) {
    if (specifier === "@/lib/app-links") {
      return { url: "data:text/javascript," + encodeURIComponent("export const appHref = (p) => p;"), shortCircuit: true };
    }
    if (specifier.startsWith("./") && !/\\.[a-z]+$/.test(specifier)) {
      return next(specifier + ".ts", context);
    }
    return next(specifier, context);
  }`;
register("data:text/javascript," + encodeURIComponent(hooks));

const i18n = await import("./index.ts");
const { en } = await import("./en.ts");
const { de } = await import("./de.ts");
const { no } = await import("./no.ts");
const { getCopy, isLocale, localeFromPath, stripLocale, localizedPath, languageAlternates, locales } = i18n;

function flattenKeys(value: unknown, prefix = ""): string[] {
  if (Array.isArray(value)) return [prefix + "[]"];
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([k, v]) => flattenKeys(v, prefix ? `${prefix}.${k}` : k));
  }
  return [prefix];
}

test("getCopy returns the dictionary for each locale", () => {
  assert.equal(getCopy("en"), en);
  assert.equal(getCopy("no"), no);
  assert.equal(getCopy("de"), de);
});

test("isLocale accepts supported locales only", () => {
  for (const l of locales) assert.equal(isLocale(l), true);
  assert.equal(isLocale("fr"), false);
  assert.equal(isLocale(""), false);
});

test("localeFromPath falls back to en for unprefixed or unknown paths", () => {
  assert.equal(localeFromPath("/no/pricing"), "no");
  assert.equal(localeFromPath("/de"), "de");
  assert.equal(localeFromPath("/pricing"), "en");
  assert.equal(localeFromPath("/fr/pricing"), "en");
  assert.equal(localeFromPath("/"), "en");
});

test("stripLocale removes the prefix and keeps a root path", () => {
  assert.equal(stripLocale("/de/pricing"), "/pricing");
  assert.equal(stripLocale("/no"), "/");
  assert.equal(stripLocale("/pricing"), "/pricing");
});

test("localizedPath adds a prefix for non-English locales", () => {
  assert.equal(localizedPath("en", "/pricing"), "/pricing");
  assert.equal(localizedPath("no", "/pricing"), "/no/pricing");
  assert.equal(localizedPath("de", "/"), "/de");
  assert.equal(localizedPath("en", "/"), "/");
});

test("languageAlternates maps every language and x-default", () => {
  assert.deepEqual(languageAlternates("/pricing"), {
    en: "/pricing",
    nb: "/no/pricing",
    de: "/de/pricing",
    "x-default": "/pricing",
  });
});

test("de and no define exactly the keys of en", () => {
  const base = new Set(flattenKeys(en));
  for (const [name, dict] of [["de", de], ["no", no]] as const) {
    const keys = new Set(flattenKeys(dict));
    const missing = [...base].filter((k) => !keys.has(k));
    const extra = [...keys].filter((k) => !base.has(k));
    assert.deepEqual(missing, [], `${name} is missing keys`);
    assert.deepEqual(extra, [], `${name} has extra keys`);
  }
});
