import assert from "node:assert/strict";
import test from "node:test";
import { renderNoTraceEmail, renderWelcomeEmail } from "./email-templates.ts";

const origin = "https://www.tracify.tech";

test("welcome email escapes names and stays in the palette", () => {
  const email = renderWelcomeEmail({ name: '<script>alert(1)</script> Eve', origin });
  assert.ok(!email.html.includes("<script>"));
  assert.match(email.html, /#f4d44d/);
  assert.ok(!/border-radius/.test(email.html));
  assert.ok(email.text.includes(`${origin}/onboarding`));
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
