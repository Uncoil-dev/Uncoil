import { describe, expect, it } from "vitest";
import { buildChangelogRss, escapeXml, parseReleases } from "./changelog-feed";

const log = `# Log

## [Unreleased]

### Features
- Not shipped.

## [1.2.0] — 2026-02-03

### Features
- Added <b>tracing</b> & "alerts".

## [1.1.0] — 2026-01-01

### Fixes
- None.
- Fixed a bug.
`;

describe("changelog feed", () => {
  it("parses dated releases in order and skips unreleased", () => {
    const r = parseReleases(log);
    expect(r.map((x) => x.code)).toEqual(["1.2.0", "1.1.0"]);
    expect(r[1].items).toEqual(["Fixed a bug."]);
  });

  it("escapes markup and keeps entry order", () => {
    const xml = buildChangelogRss(parseReleases(log));
    expect(xml).toContain("Added &lt;b&gt;tracing&lt;/b&gt; &amp; &quot;alerts&quot;.");
    expect(xml.indexOf("Release 1.2.0")).toBeLessThan(xml.indexOf("Release 1.1.0"));
    expect(xml).toContain('<rss version="2.0"');
    expect(xml).toContain("<pubDate>Tue, 03 Feb 2026 00:00:00 GMT</pubDate>");
    expect(xml).toContain("/changelog#release-1.2.0");
  });

  it("escapes xml characters", () => {
    expect(escapeXml(`a&b<'">`)).toBe("a&amp;b&lt;&apos;&quot;&gt;");
  });
});
