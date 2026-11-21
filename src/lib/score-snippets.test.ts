import { expect, test } from "vitest";
import { scoreSnippet, type ScoreSnippetLanguage } from "./score-snippets.ts";

const languages: ScoreSnippetLanguage[] = ["python", "typescript"];

for (const language of languages) {
  test(`scoreSnippet(${language}) is non-empty and embeds the project id`, () => {
    const snippet = scoreSnippet(language, "proj_test_123");
    expect(snippet.trim().length).toBeGreaterThan(0);
    expect(snippet).toContain("proj_test_123");
    expect(snippet).not.toContain("${");
  });
}

test("scoreSnippet differs per language and per project id", () => {
  expect(scoreSnippet("python", "p1")).not.toBe(scoreSnippet("typescript", "p1"));
  expect(scoreSnippet("python", "p1")).not.toBe(scoreSnippet("python", "p2"));
});
