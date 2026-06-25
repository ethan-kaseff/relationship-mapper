import { describe, it, expect } from "vitest";
import { deriveRpID, parseCookie, parseTransports } from "./webauthn";

describe("deriveRpID", () => {
  it("strips the port for localhost", () => {
    expect(deriveRpID("http://localhost:3000")).toBe("localhost");
  });

  it("returns the bare domain for a production origin", () => {
    expect(deriveRpID("https://jcrb-relationship-mapper.vercel.app")).toBe(
      "jcrb-relationship-mapper.vercel.app"
    );
  });

  it("ignores path and query", () => {
    expect(deriveRpID("https://example.com/login?next=/dashboard")).toBe(
      "example.com"
    );
  });
});

describe("parseCookie", () => {
  it("extracts a named cookie from a multi-value header", () => {
    expect(
      parseCookie("a=1; pk_auth_challenge=abc123; b=2", "pk_auth_challenge")
    ).toBe("abc123");
  });

  it("returns undefined when the cookie is absent", () => {
    expect(parseCookie("a=1; b=2", "missing")).toBeUndefined();
  });

  it("returns undefined when the header is null", () => {
    expect(parseCookie(null, "anything")).toBeUndefined();
  });

  it("url-decodes the value", () => {
    expect(parseCookie("x=a%20b", "x")).toBe("a b");
  });

  it("does not match a prefix of another cookie name", () => {
    expect(parseCookie("pk_auth_challenge_x=nope", "pk_auth_challenge")).toBeUndefined();
  });
});

describe("parseTransports", () => {
  it("splits a comma-separated list", () => {
    expect(parseTransports("internal,hybrid")).toEqual(["internal", "hybrid"]);
  });

  it("trims whitespace and drops empties", () => {
    expect(parseTransports("usb, , nfc")).toEqual(["usb", "nfc"]);
  });

  it("returns undefined for empty or null input", () => {
    expect(parseTransports("")).toBeUndefined();
    expect(parseTransports(null)).toBeUndefined();
    expect(parseTransports(undefined)).toBeUndefined();
  });
});
