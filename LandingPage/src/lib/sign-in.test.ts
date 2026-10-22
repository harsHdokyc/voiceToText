import { describe, expect, it } from "vitest";
import { signInError } from "./sign-in";

const valid = { email: "maya@example.com", password: "12345678", name: "Maya" };

describe("signInError", () => {
  it("uses the same email rule as the waitlist", () => {
    expect(signInError("signin", { ...valid, email: "maya@" })).toBe("That doesn't look like a valid email.");
    expect(signInError("signin", { ...valid, email: "  " })).toBe("Enter your email address.");
  });

  it("accepts an email with surrounding spaces, like the waitlist does", () => {
    expect(signInError("signin", { ...valid, email: " maya@example.com " })).toBeNull();
  });

  it("requires 8+ password characters for sign-in and sign-up", () => {
    expect(signInError("signin", { ...valid, password: "1234567" })).toBe("Enter a password with at least 8 characters.");
    expect(signInError("signup", { ...valid, password: "1234567" })).toBe("Enter a password with at least 8 characters.");
  });

  it("ignores the password when resetting", () => {
    expect(signInError("reset", { ...valid, password: "" })).toBeNull();
  });

  it("requires a non-blank name only on sign-up", () => {
    expect(signInError("signup", { ...valid, name: "   " })).toBe("Enter your name.");
    expect(signInError("signin", { ...valid, name: "" })).toBeNull();
  });
});
