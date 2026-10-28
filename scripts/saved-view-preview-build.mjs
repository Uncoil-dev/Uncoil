import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { pathToFileURL } from "node:url";

export const PREVIEW_BRANCH = "codex/tracing-saved-views";
export function buildPlan(env) {
  const isolated =
    env.VERCEL_ENV === "preview" &&
    env.VERCEL_GIT_COMMIT_REF === PREVIEW_BRANCH &&
    env.NEXT_PUBLIC_UNCOIL_DEPLOYMENT_KIND === "cloud";
  if (!isolated || !env.CONVEX_DEPLOY_KEY) return "frontend";
  if (!env.CONVEX_DEPLOY_KEY.startsWith("preview:"))
    throw Error(
      "Saved-view testing needs a Preview Deploy Key. A production key will not be used.",
    );
  return "isolated";
}
function sanitized(text, env) {
  let result = String(text ?? "");
  for (const [name, value] of Object.entries(env))
    if (
      /SECRET|TOKEN|PASSWORD|API_KEY|DEPLOY_KEY/.test(name) &&
      value?.length >= 8
    )
      result = result.replaceAll(value, "[redacted]");
  return result;
}
function run(args, env, input, quiet = false) {
  const result = spawnSync("pnpm", args, {
    env,
    input,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
  if (!quiet) {
    process.stdout.write(sanitized(result.stdout, env));
    process.stderr.write(sanitized(result.stderr, env));
  }
  return result;
}
export function previewUrls(env) {
  const cloud = new URL(env.NEXT_PUBLIC_CONVEX_URL);
  if (
    cloud.protocol !== "https:" ||
    !cloud.hostname.endsWith(".convex.cloud") ||
    cloud.hostname.startsWith("jovial-owl-711.")
  )
    throw Error(
      "Refusing to configure the production backend as a saved-view preview.",
    );
  const site = cloud.href.replace(/\.convex\.cloud\/?$/, ".convex.site");
  return {
    cloud: cloud.origin,
    site,
    deployment: cloud.hostname.split(".")[0],
  };
}
export function main(
  env = process.env,
  frontend = process.argv.includes("--frontend"),
) {
  const plan = buildPlan(env);
  if (frontend) {
    if (plan !== "isolated")
      throw Error("Isolated preview build context is required.");
    const urls = previewUrls(env);
    const backendEnv = {
      ...env,
      NEXT_PUBLIC_CONVEX_URL: urls.cloud,
      NEXT_PUBLIC_CONVEX_SITE_URL: urls.site,
      CONVEX_SITE_URL: urls.site,
      UNCOIL_REGION: "eu",
      NEXT_PUBLIC_UNCOIL_REGION: "eu",
    };
    const origin = `https://${env.VERCEL_BRANCH_URL ?? env.VERCEL_URL}`;
    if (!env.VERCEL_BRANCH_URL && !env.VERCEL_URL)
      throw Error("Preview hostname is missing.");
    if (!env.UNCOIL_API_KEY_HASH_SECRET)
      throw Error(
        "Preview frontend needs its existing UNCOIL_API_KEY_HASH_SECRET.",
      );
    const get = (name) =>
      run(
        ["exec", "convex", "env", "get", name, "--deployment", urls.deployment],
        backendEnv,
        undefined,
        true,
      );
    const existing = get("BETTER_AUTH_SECRET");
    const settings = {
      SITE_URL: origin,
      UNCOIL_REGION: "eu",
      UNCOIL_API_KEY_HASH_SECRET: env.UNCOIL_API_KEY_HASH_SECRET,
    };
    if (existing.status !== 0 || !existing.stdout.trim())
      settings.BETTER_AUTH_SECRET = randomBytes(32).toString("hex");
    for (const [name, value] of Object.entries(settings)) {
      const result = run(
        ["exec", "convex", "env", "set", name, "--deployment", urls.deployment],
        backendEnv,
        value,
        true,
      );
      if (result.status !== 0)
        throw Error(`Could not configure isolated preview variable ${name}.`);
    }
    console.log(
      "Building frontend against the isolated saved-view Convex preview.",
    );
    const result = run(["build"], {
      ...backendEnv,
      NEXT_PUBLIC_SITE_URL: origin,
    });
    return result.status ?? 1;
  }
  if (plan === "frontend") return run(["build"], env).status ?? 1;
  const deploymentEnv = { ...env };
  delete deploymentEnv.CONVEX_DEPLOYMENT;
  delete deploymentEnv.CONVEX_SELF_HOSTED_URL;
  delete deploymentEnv.CONVEX_SELF_HOSTED_ADMIN_KEY;
  return (
    run(
      [
        "exec",
        "convex",
        "deploy",
        "--preview-name",
        PREVIEW_BRANCH,
        "--cmd-url-env-var-name",
        "NEXT_PUBLIC_CONVEX_URL",
        "--cmd",
        "node scripts/saved-view-preview-build.mjs --frontend",
        "--typecheck",
        "enable",
      ],
      deploymentEnv,
    ).status ?? 1
  );
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    process.exitCode = main();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
