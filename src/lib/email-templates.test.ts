import assert from "node:assert/strict";
import test from "node:test";
import { renderFirstTraceEmail, renderNoTraceEmail, renderWelcomeEmail } from "./email-templates.ts";

const origin = "https://www.uncoil.dev";

test("welcome email escapes names and stays in the palette", () => {
  const email = renderWelcomeEmail({ name: '<script>alert(1)</script> Eve', origin });
  assert.ok(!email.html.includes("<script>"));
  assert.match(email.html, /#f4d44d/);
  assert.ok(!/border-radius/.test(email.html));
  assert.ok(email.text.includes(`${origin}/onboarding`));
});

test("welcome email shows the one-line init() setup for both SDKs", () => {
  const email = renderWelcomeEmail({ origin });
  for (const body of [email.html, email.text]) {
    assert.ok(body.includes("uncoil.init()"), "Python init");
    assert.ok(body.includes("init();"), "TypeScript init");
    assert.ok(!body.includes("traceAgent") && !body.includes("trace_agent"), "no wrapper code");
  }
});

test("no-trace email links to the project quickstart and escapes the project name", () => {
  const email = renderNoTraceEmail({ name: "Kris Bon", projectName: "<b>x</b>", projectId: "abc123", origin });
  assert.ok(email.html.includes(`${origin}/dashboard/abc123/quickstart`));
  assert.ok(!email.html.includes("<b>x</b>"));
  assert.match(email.text, /Hi Kris,/);
});

test("no-trace email falls back to onboarding without a project", () => {
  assert.ok(renderNoTraceEmail({ origin }).text.includes(`${origin}/onboarding`));
});

test("first-trace email links the trace, suggests a next step and escapes the name", () => {
  const email = renderFirstTraceEmail({ name: "<i>Eve</i> Doe", projectId: "p 1", runId: "run/2", origin });
  const trace = `${origin}/dashboard/p%201/tracing/run%2F2`;
  assert.ok(email.html.includes(trace));
  assert.ok(email.text.includes(trace));
  assert.ok(email.html.includes(`${origin}/dashboard/p%201/costs`));
  assert.ok(!email.html.includes("<i>Eve</i>"));
  assert.match(email.html, /#f4d44d/);
});

test("no-trace email starts the fixes with the login and doctor commands", () => {
  const email = renderNoTraceEmail({ origin, projectId: "abc123" });
  for (const body of [email.html, email.text]) {
    const login = body.indexOf("npx @uncoil.dev/sdk login");
    const doctor = body.indexOf("npx @uncoil.dev/sdk doctor");
    assert.ok(login !== -1 && doctor !== -1, "both commands are present");
    assert.ok(login < body.indexOf("never ran through the wrapper"), "the commands come before the other fixes");
  }
});
