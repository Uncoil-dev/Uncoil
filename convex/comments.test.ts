import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");
const tooLong = "Notes must be 1 to 4000 characters";

async function setup() {
  const t = convexTest(schema, modules);
  const projectId = await t.run((ctx) =>
    ctx.db.insert("projects", {
      name: "Test",
      clerkOrgId: "org",
      clerkUserId: "owner",
    }),
  );
  return {
    t,
    projectId,
    owner: t.withIdentity({ subject: "owner", orgId: "org", name: "Olive" }),
    member: t.withIdentity({ subject: "member", orgId: "org" }),
    viewer: t.withIdentity({
      subject: "viewer",
      orgId: "org",
      orgRole: "org:viewer",
    }),
    outsider: t.withIdentity({ subject: "outsider", orgId: "other" }),
  };
}

test("notes are trimmed and empty or oversized notes are rejected", async () => {
  const { owner, projectId } = await setup();
  await owner.mutation(api.comments.createRunNote, {
    projectId,
    runId: "run-1",
    content: "  looks fine \n",
  });
  const [note] = await owner.query(api.comments.listRunNotes, {
    projectId,
    runId: "run-1",
  });
  expect(note.content).toBe("looks fine");
  expect(note.userName).toBe("Olive");

  for (const content of ["", "   \n\t", "x".repeat(4001)]) {
    await expect(
      owner.mutation(api.comments.createRunNote, {
        projectId,
        runId: "run-1",
        content,
      }),
    ).rejects.toThrow(tooLong);
  }
  // Length is measured after trimming, so padding does not count toward the limit.
  await owner.mutation(api.comments.createRunNote, {
    projectId,
    runId: "run-1",
    content: ` ${"x".repeat(4000)} `,
  });
  const notes = await owner.query(api.comments.listRunNotes, {
    projectId,
    runId: "run-1",
  });
  expect(notes).toHaveLength(2);
  expect(notes[1].content).toHaveLength(4000);
});

test("listRunNotes returns one run's notes in creation order, scoped to the project", async () => {
  const { t, owner, member, outsider, projectId } = await setup();
  const otherProject = await t.run((ctx) =>
    ctx.db.insert("projects", {
      name: "Other",
      clerkOrgId: "other",
      clerkUserId: "outsider",
    }),
  );
  for (const content of ["first", "second", "third"]) {
    await owner.mutation(api.comments.createRunNote, {
      projectId,
      runId: "run-1",
      content,
    });
  }
  await member.mutation(api.comments.createRunNote, {
    projectId,
    runId: "run-2",
    content: "other run",
  });
  // Same run id in a different project must not leak into this project's list.
  await outsider.mutation(api.comments.createRunNote, {
    projectId: otherProject,
    runId: "run-1",
    content: "foreign",
  });

  const notes = await member.query(api.comments.listRunNotes, {
    projectId,
    runId: "run-1",
  });
  expect(notes.map((n) => n.content)).toEqual(["first", "second", "third"]);
  expect(notes.every((n) => n.projectId === projectId)).toBe(true);

  expect(
    (
      await outsider.query(api.comments.listRunNotes, {
        projectId: otherProject,
        runId: "run-1",
      })
    ).map((n) => n.content),
  ).toEqual(["foreign"]);
  expect(
    await outsider.query(api.comments.listRunNotes, {
      projectId,
      runId: "run-1",
    }),
  ).toEqual([]);
});

test("viewers and outsiders cannot add notes but viewers can read them", async () => {
  const { t, owner, viewer, outsider, projectId } = await setup();
  await owner.mutation(api.comments.createRunNote, {
    projectId,
    runId: "run-1",
    content: "hello",
  });
  await expect(
    viewer.mutation(api.comments.createRunNote, {
      projectId,
      runId: "run-1",
      content: "nope",
    }),
  ).rejects.toThrow("Developer access required");
  await expect(
    outsider.mutation(api.comments.createRunNote, {
      projectId,
      runId: "run-1",
      content: "nope",
    }),
  ).rejects.toThrow("access denied");
  await expect(
    t.mutation(api.comments.createRunNote, {
      projectId,
      runId: "run-1",
      content: "nope",
    }),
  ).rejects.toThrow("Unauthorized");
  const notes = await viewer.query(api.comments.listRunNotes, {
    projectId,
    runId: "run-1",
  });
  expect(notes.map((n) => n.content)).toEqual(["hello"]);
});
