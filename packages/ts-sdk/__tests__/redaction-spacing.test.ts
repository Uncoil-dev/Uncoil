import { describe, expect, it } from "vitest";
import { buildRedactor } from "../src/index";

describe("card number masking keeps surrounding spacing", () => {
  const redact = buildRedactor()!;

  it("keeps a trailing space", () => {
    expect(redact("card 4111 1111 1111 1111 ok")).toBe("card [redacted] ok");
  });

  it("keeps a trailing hyphen", () => {
    expect(redact("card 4111-1111-1111-1111- ok")).toBe("card [redacted]- ok");
  });

  it("masks a number at the end of the text and leaves long ids alone", () => {
    expect(redact("card 4111111111111111")).toBe("card [redacted]");
    expect(redact("id 1700000000000000 ok")).toBe("id 1700000000000000 ok");
  });
});
