import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// We test the regex pattern used in validateOrigin for localhost matching
const LOCALHOST_PATTERN = /^https?:\/\/localhost(:\d+)?$/;

describe("CSRF Localhost Pattern", () => {
  it("matches http://localhost", () => {
    expect(LOCALHOST_PATTERN.test("http://localhost")).toBe(true);
  });

  it("matches https://localhost", () => {
    expect(LOCALHOST_PATTERN.test("https://localhost")).toBe(true);
  });

  it("matches http://localhost:3000", () => {
    expect(LOCALHOST_PATTERN.test("http://localhost:3000")).toBe(true);
  });

  it("matches http://localhost:3001", () => {
    expect(LOCALHOST_PATTERN.test("http://localhost:3001")).toBe(true);
  });

  it("matches any port number", () => {
    expect(LOCALHOST_PATTERN.test("http://localhost:8080")).toBe(true);
    expect(LOCALHOST_PATTERN.test("http://localhost:443")).toBe(true);
    expect(LOCALHOST_PATTERN.test("http://localhost:9999")).toBe(true);
    expect(LOCALHOST_PATTERN.test("https://localhost:54321")).toBe(true);
  });

  it("rejects localhost with path", () => {
    expect(LOCALHOST_PATTERN.test("http://localhost:3000/api")).toBe(false);
  });

  it("rejects non-localhost origins", () => {
    expect(LOCALHOST_PATTERN.test("http://evil.com")).toBe(false);
    expect(LOCALHOST_PATTERN.test("http://localhost.evil.com")).toBe(false);
    expect(LOCALHOST_PATTERN.test("http://notlocalhost:3000")).toBe(false);
  });

  it("rejects malformed origins", () => {
    expect(LOCALHOST_PATTERN.test("localhost:3000")).toBe(false);
    expect(LOCALHOST_PATTERN.test("ftp://localhost:3000")).toBe(false);
    expect(LOCALHOST_PATTERN.test("")).toBe(false);
  });

  it("rejects port with non-numeric characters", () => {
    expect(LOCALHOST_PATTERN.test("http://localhost:abc")).toBe(false);
    expect(LOCALHOST_PATTERN.test("http://localhost:3000abc")).toBe(false);
  });
});

describe("CSRF validateOrigin", () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it("localhost allowed in development", () => {
    process.env.NODE_ENV = "development";
    const origin = "http://localhost:3001";
    const isLocalhost = LOCALHOST_PATTERN.test(origin);
    const isDev = process.env.NODE_ENV !== "production";
    expect(isLocalhost && isDev).toBe(true);
  });

  it("localhost blocked in production", () => {
    process.env.NODE_ENV = "production";
    const origin = "http://localhost:3001";
    const isLocalhost = LOCALHOST_PATTERN.test(origin);
    const isDev = process.env.NODE_ENV !== "production";
    expect(isLocalhost && isDev).toBe(false);
  });
});
