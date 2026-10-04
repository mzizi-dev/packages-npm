import { describe, expect, test } from "vite-plus/test";

import {
  clearCookie,
  getCookie,
  parseCookieHeader,
  parseSetCookie,
  serializeCookie,
  withSetCookies,
} from "./cookies.js";

describe("serializeCookie", () => {
  test("defaults to the safe flags", () => {
    expect(serializeCookie("s", "abc")).toBe(
      "s=abc; Path=/; HttpOnly; Secure; SameSite=Lax",
    );
  });

  test("drops Secure only when asked, and never for SameSite=None", () => {
    expect(serializeCookie("s", "1", { secure: false, maxAge: 60 })).toBe(
      "s=1; Path=/; Max-Age=60; HttpOnly; SameSite=Lax",
    );
    expect(
      serializeCookie("s", "1", { secure: false, sameSite: "None" }),
    ).toContain("Secure");
  });

  test("refuses names and values a browser would split", () => {
    expect(() => serializeCookie("a b", "1")).toThrow();
    expect(() => serializeCookie("a", "x; Domain=evil")).toThrow();
    expect(() => serializeCookie("a", 'q"')).toThrow();
  });

  test("clearCookie sets Max-Age=0", () => {
    expect(clearCookie("s")).toBe(
      "s=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax",
    );
  });
});

describe("parsing", () => {
  test("reads a Cookie header", () => {
    expect(parseCookieHeader("a=1; b=x=y;  ; bad; c=")).toEqual([
      ["a", "1"],
      ["b", "x=y"],
      ["c", ""],
    ]);
    expect(getCookie("a=1; a=2", "a")).toBe("1");
    expect(getCookie(null, "a")).toBeNull();
  });

  test("reads a Set-Cookie and spots a clear", () => {
    expect(parseSetCookie("s=abc; Path=/; HttpOnly")).toEqual({
      name: "s",
      value: "abc",
      cleared: false,
    });
    expect(parseSetCookie("s=abc; Max-Age=0")?.cleared).toBe(true);
    expect(parseSetCookie("s=; Path=/")?.cleared).toBe(true);
    expect(parseSetCookie("nonsense")).toBeNull();
  });
});

describe("withSetCookies", () => {
  test("appends to a mutable response", () => {
    const r = withSetCookies(new Response("ok"), ["a=1", "b=2"]);
    expect(r.headers.getSetCookie()).toEqual(["a=1", "b=2"]);
  });

  test("rebuilds a redirect, whose headers are immutable", () => {
    const r = withSetCookies(
      Response.redirect("https://example.test/next", 303),
      ["a=1"],
    );
    expect(r.status).toBe(303);
    expect(r.headers.get("location")).toBe("https://example.test/next");
    expect(r.headers.getSetCookie()).toEqual(["a=1"]);
  });
});
