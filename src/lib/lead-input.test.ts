import { describe, expect, it } from "vitest";
import { leadInputError } from "./lead-input";

describe("leadInputError", () => {
  it("accepts a contact request and a newsletter signup", () => {
    expect(leadInputError({ email: "ada@example.com", message: "Hi" })).toBeNull();
    expect(leadInputError({ email: "ada@example.com", intent: "newsletter", marketingConsent: true })).toBeNull();
  });

  it("asks for a valid email address", () => {
    expect(leadInputError({ email: "ada@", message: "Hi" })).toBe("Enter a valid email address");
    expect(leadInputError({ message: "Hi" })).toBe("Enter a valid email address");
    for (const email of ["ada@example", "@example.com", "ada@.com", "ada@example.", "ada lovelace@example.com"]) {
      expect(leadInputError({ email, message: "Hi" }), email).toBe("Enter a valid email address");
    }
    expect(leadInputError({ email: "ada@mail.example.com", message: "Hi" })).toBeNull();
  });

  it("asks for a message when there is no message or intent", () => {
    expect(leadInputError({ email: "ada@example.com", message: "   " })).toBe("Add a message");
  });

  it("names the field that is too long", () => {
    expect(leadInputError({ email: "ada@example.com", message: "Hi", useCase: "x".repeat(501) })).toBe(
      "Use case is too long (500 characters max)",
    );
    expect(leadInputError({ email: "ada@example.com", message: "m".repeat(4001) })).toBe(
      "Message is too long (4000 characters max)",
    );
  });

  it("rejects fields that are not text", () => {
    expect(leadInputError({ email: "ada@example.com", message: ["Hi"] })).toBe("Invalid request");
  });
});
