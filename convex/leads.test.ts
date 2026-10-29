import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");
const lead = { name: "Test User", email: "test@example.com", intent: "contact", message: "A useful request", marketingConsent: false, sourcePath: "/contact" };

test("unauthorized users cannot list or mutate leads", async () => {
  const t = convexTest(schema, modules);
  await expect(t.query(api.leads.list, {})).rejects.toThrow("Admin access required");
  const id = await t.mutation(api.leads.submit, lead);
  await expect(t.mutation(api.leads.updateStatus, { leadId: id, status: "contacted" })).rejects.toThrow("Admin access required");
  await expect(t.mutation(api.leads.addNote, { leadId: id, body: "no" })).rejects.toThrow("Admin access required");
});

test("admins can transition, assign, and annotate a lead", async () => {
  process.env.UNCOIL_LIBRARY_ADMIN_EMAILS = "admin@example.com";
  const t = convexTest(schema, modules);
  const id = await t.mutation(api.leads.submit, lead);
  const admin = t.withIdentity({ subject: "admin", email: "admin@example.com" });
  await admin.mutation(api.leads.updateStatus, { leadId: id, status: "qualified", assignedTo: "owner@example.com" });
  await admin.mutation(api.leads.addNote, { leadId: id, body: "Follow up this week" });
  await expect(admin.query(api.leads.list, { status: "qualified" })).resolves.toHaveLength(1);
  await expect(admin.query(api.leads.listNotes, { leadId: id })).resolves.toMatchObject([{ body: "Follow up this week" }]);
});

test("blank notes are rejected and duplicate keys are idempotent", async () => {
  process.env.UNCOIL_LIBRARY_ADMIN_EMAILS = "admin@example.com";
  const t = convexTest(schema, modules);
  const admin = t.withIdentity({ subject: "admin", email: "admin@example.com" });
  const first = await t.mutation(api.leads.submit, { ...lead, dedupeKey: "same-key" });
  await expect(admin.mutation(api.leads.addNote, { leadId: first, body: "   " })).rejects.toThrow("Note must contain");
  const second = await t.mutation(api.leads.submit, { ...lead, dedupeKey: "same-key" });
  expect(second).toBe(first);
});

test("authorized empty lead list is empty", async () => {
  process.env.UNCOIL_LIBRARY_ADMIN_EMAILS = "admin@example.com";
  const t = convexTest(schema, modules);
  const admin = t.withIdentity({ subject: "admin", email: "admin@example.com" });
  await expect(admin.query(api.leads.list, {})).resolves.toEqual([]);
});
