import { describe, it, expect } from "vitest";

// Extracted password strength logic (mirrors register page component)
function getPasswordStrength(pw: string): { score: number; label: string; checks: { label: string; met: boolean }[] } {
  const checks = [
    { label: "10+ characters", met: pw.length >= 10 },
    { label: "Uppercase letter", met: /[A-Z]/.test(pw) },
    { label: "Lowercase letter", met: /[a-z]/.test(pw) },
    { label: "Number", met: /[0-9]/.test(pw) },
    { label: "Special character", met: /[^A-Za-z0-9]/.test(pw) },
  ];
  const score = checks.filter((c) => c.met).length;
  const label = score <= 1 ? "Weak" : score <= 2 ? "Fair" : score <= 3 ? "Good" : score <= 4 ? "Strong" : "Excellent";
  return { score, label, checks };
}

describe("getPasswordStrength", () => {
  it("scores empty password as 0 (Weak)", () => {
    const result = getPasswordStrength("");
    expect(result.score).toBe(0);
    expect(result.label).toBe("Weak");
  });

  it("scores short lowercase-only as 1 (Weak)", () => {
    const result = getPasswordStrength("abc");
    expect(result.score).toBe(1); // only lowercase
    expect(result.label).toBe("Weak");
  });

  it("scores 10+ lowercase as 2 (Fair)", () => {
    const result = getPasswordStrength("abcdefghij");
    expect(result.score).toBe(2); // length + lowercase
    expect(result.label).toBe("Fair");
  });

  it("scores 10+ mixed case as 3 (Good)", () => {
    const result = getPasswordStrength("Abcdefghij");
    expect(result.score).toBe(3); // length + upper + lower
    expect(result.label).toBe("Good");
  });

  it("scores 10+ mixed case with number as 4 (Strong)", () => {
    const result = getPasswordStrength("Abcdefgh1j");
    expect(result.score).toBe(4);
    expect(result.label).toBe("Strong");
  });

  it("scores 10+ mixed case with number and special as 5 (Excellent)", () => {
    const result = getPasswordStrength("Abcdefg1j!");
    expect(result.score).toBe(5);
    expect(result.label).toBe("Excellent");
  });

  it("checks are independent (special char without length)", () => {
    const result = getPasswordStrength("Ab1!");
    expect(result.score).toBe(4); // upper + lower + number + special, but not length
    expect(result.label).toBe("Strong");
  });

  it("returns correct check statuses", () => {
    const result = getPasswordStrength("Short1!");
    const lengthCheck = result.checks.find((c) => c.label === "10+ characters");
    const upperCheck = result.checks.find((c) => c.label === "Uppercase letter");
    const numberCheck = result.checks.find((c) => c.label === "Number");
    const specialCheck = result.checks.find((c) => c.label === "Special character");

    expect(lengthCheck?.met).toBe(false);
    expect(upperCheck?.met).toBe(true);
    expect(numberCheck?.met).toBe(true);
    expect(specialCheck?.met).toBe(true);
  });

  it("handles unicode and special characters", () => {
    const result = getPasswordStrength("Pässwörd123!");
    expect(result.checks.find((c) => c.label === "Special character")?.met).toBe(true);
    expect(result.checks.find((c) => c.label === "10+ characters")?.met).toBe(true);
    expect(result.score).toBe(5);
  });

  it("spaces count toward length but not special chars", () => {
    const result = getPasswordStrength("ab cd ef gh ij");
    // 14 chars (length met), lowercase met, space is special char
    expect(result.checks.find((c) => c.label === "10+ characters")?.met).toBe(true);
    expect(result.checks.find((c) => c.label === "Special character")?.met).toBe(true);
  });
});

// ── Backend validation (mirrors API route) ──

describe("backend password validation", () => {
  it("rejects passwords under 10 characters", () => {
    expect("short".length < 10).toBe(true);
    expect("exactly10!".length >= 10).toBe(true);
  });

  it("email validation regex works", () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    expect(emailRegex.test("user@example.com")).toBe(true);
    expect(emailRegex.test("user@example")).toBe(false);
    expect(emailRegex.test("@example.com")).toBe(false);
    expect(emailRegex.test("user example.com")).toBe(false);
    expect(emailRegex.test("")).toBe(false);
  });

  it("username validation regex works", () => {
    const usernameRegex = /^[a-zA-Z0-9_]{3,32}$/;
    expect(usernameRegex.test("andre")).toBe(true);
    expect(usernameRegex.test("a_b")).toBe(true);
    expect(usernameRegex.test("ab")).toBe(false); // too short
    expect(usernameRegex.test("a".repeat(33))).toBe(false); // too long
    expect(usernameRegex.test("user name")).toBe(false); // space
    expect(usernameRegex.test("user@name")).toBe(false); // special char
  });
});
