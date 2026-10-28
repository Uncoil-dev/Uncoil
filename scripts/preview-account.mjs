// Makes sure a staging test account exists for localhost previews and prints its login.
// Talks to the staging Convex site only (never live) and writes the login to
// .preview-account.json next to the preview, so agents and you use the same account.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";

const site = process.env.NEXT_PUBLIC_CONVEX_SITE_URL;
if (!site || !site.includes("first-malamute-177")) {
  console.error("Skipping test account: backend is not the staging deployment.");
  process.exit(0);
}
const file = ".preview-account.json";
const origin = `http://localhost:${process.env.PREVIEW_PORT ?? "4000"}`;
const account = existsSync(file)
  ? JSON.parse(readFileSync(file, "utf8"))
  : { email: "preview-local@uncoil.dev", password: `Pv-${randomBytes(9).toString("hex")}`, name: "Preview Tester" };

async function post(path, body) {
  const res = await fetch(`${site}/api/auth/${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", origin },
    body: JSON.stringify(body),
  });
  return { status: res.status, text: await res.text() };
}

try {
  let r = await post("sign-in/email", { email: account.email, password: account.password });
  if (r.status !== 200) {
    const up = await post("sign-up/email", account);
    if (up.status !== 200) {
      console.error(`Could not create the test account (${up.status}): ${up.text.slice(0, 200)}`);
      throw new Error("sign-up failed");
    }
    r = await post("sign-in/email", { email: account.email, password: account.password });
  }
  writeFileSync(file, JSON.stringify(account, null, 2));
  // Same-origin helper page: opening it signs the browser in, then lands on the dashboard.
  mkdirSync("public", { recursive: true });
  writeFileSync(
    "public/preview-login.html",
    `<!doctype html><meta charset="utf-8"><title>Signing in...</title><body style="font:14px monospace;background:#eceae3;padding:2rem"><p id="m">Signing in to the preview...</p><script>
const m=document.getElementById("m"),b=JSON.stringify(${JSON.stringify({ email: account.email, password: account.password })});
const go=n=>fetch("/api/auth/sign-in/email",{method:"POST",headers:{"content-type":"application/json"},credentials:"same-origin",body:b})
.then(async r=>{if(r.ok)return location.replace("/dashboard");const t=(await r.text()).slice(0,160);if(n<3){m.textContent="Preview still starting, trying again...";return setTimeout(()=>go(n+1),4000)}throw new Error("status "+r.status+" "+t)})
.catch(e=>{m.textContent="Auto sign-in failed ("+e.message+"). Use the email and password shown in the PowerShell window."});
go(0);
</script>`,
  );
  console.log(`\nTest login for the preview (staging only):\n  email:    ${account.email}\n  password: ${account.password}\n  sign-in check: ${r.status === 200 ? "works" : `failed (${r.status}) - ${r.text.slice(0, 120)}`}\n`);
} catch (error) {
  console.error(`Test account step failed: ${error.message}`);
}
