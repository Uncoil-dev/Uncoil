import assert from "node:assert/strict";
import fs from "node:fs";

const contract = JSON.parse(fs.readFileSync("config/regional-cloud.json", "utf8"));
const regionSource = fs.readFileSync("src/lib/regions.ts", "utf8");
const sdkSource = fs.readFileSync("packages/ts-sdk/src/index.ts", "utf8");
const envExample = fs.readFileSync(".env.local.example", "utf8");

assert.deepEqual(Object.keys(contract.regions), ["eu", "us"]);
for (const [id, region] of Object.entries(contract.regions)) {
  assert.match(region.origin, new RegExp(`^https://${id}\\.cloud\\.uncoil\\.tech$`));
  assert.ok(regionSource.includes(region.origin), `${region.origin} is missing from the application region registry`);
  assert.ok(sdkSource.includes(region.origin), `${region.origin} is missing from the TypeScript SDK`);
  assert.match(region.infrastructure.vercelProject, new RegExp(`${id}$`));
  assert.ok(region.infrastructure.convexUrl.includes(region.infrastructure.convexDeployment));
  assert.ok(region.infrastructure.convexSiteUrl.includes(region.infrastructure.convexDeployment));
}
for (const name of contract.requiredCloudEnvironment) {
  assert.ok(envExample.includes(`${name}=`), `${name} is missing from .env.local.example`);
}
assert.equal(new Set(contract.requiredIsolatedServices).size, contract.requiredIsolatedServices.length);
assert.equal(new Set(Object.values(contract.regions).map((region) => region.infrastructure.vercelProject)).size, 2);
assert.equal(new Set(Object.values(contract.regions).map((region) => region.infrastructure.convexDeployment)).size, 2);
assert.ok(contract.externalReadiness.length >= 5, "Regional launch readiness must track external provider work");
console.log(`Regional cloud contract verified for ${Object.keys(contract.regions).length} regions.`);
