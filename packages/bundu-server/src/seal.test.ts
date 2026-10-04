import { describe, expect, test } from "vite-plus/test";

import {
  createSealer,
  MIN_SECRET_LENGTH,
  pkceChallenge,
  randomToken,
} from "./seal.js";

const SECRET = "0123456789abcdef0123456789abcdef";
const SESSION = "nyuchi-console/session/v1";

describe("createSealer", () => {
  test("round-trips and hides the payload", async () => {
    const s = createSealer(SECRET);
    const sealed = await s.seal(SESSION, { a: "hello" });
    expect(sealed).not.toContain("hello");
    expect(sealed).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(await s.unseal(SESSION, sealed)).toEqual({ a: "hello" });
  });

  test("uses a fresh nonce every time", async () => {
    const s = createSealer(SECRET);
    expect(await s.seal(SESSION, 1)).not.toBe(await s.seal(SESSION, 1));
  });

  test("unseals a value sealed by the Rust sealer (seal.rs)", async () => {
    // Produced by the Nyuchi console backend's Sealer::seal(Purpose::Session, {"a":"hello","n":1}).
    const fromRust =
      "IC_O1TFdhut01aYbu1s4KEinwR5hSnsM3CS14AYNP-E1o-fIoshzIG-0ltY3c0U";
    expect(await createSealer(SECRET).unseal(SESSION, fromRust)).toEqual({
      a: "hello",
      n: 1,
    });
  });

  test("refuses another purpose, another key, tampering and junk", async () => {
    const s = createSealer(SECRET);
    const sealed = await s.seal(SESSION, { a: 1 });
    expect(await s.unseal("nyuchi-console/sign-in/v1", sealed)).toBeNull();
    expect(await createSealer(`${SECRET}x`).unseal(SESSION, sealed)).toBeNull();
    const flipped = sealed.slice(0, -2) + (sealed.endsWith("AA") ? "AB" : "AA");
    expect(await s.unseal(SESSION, flipped)).toBeNull();
    for (const junk of [null, undefined, "", "abc", "!!!", "A".repeat(10)]) {
      expect(await s.unseal(SESSION, junk)).toBeNull();
    }
  });

  test("refuses a short secret and an empty purpose", async () => {
    expect(() => createSealer("x".repeat(MIN_SECRET_LENGTH - 1))).toThrow();
    await expect(createSealer(SECRET).seal("", 1)).rejects.toThrow();
  });
});

describe("tokens", () => {
  test("randomToken is base64url of n bytes", () => {
    const t = randomToken(32);
    expect(t).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(randomToken(32)).not.toBe(t);
  });

  test("pkceChallenge matches RFC 7636 appendix B", async () => {
    expect(
      await pkceChallenge("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"),
    ).toBe("E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
  });
});
