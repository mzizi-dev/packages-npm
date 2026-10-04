import { describe, expect, test } from "vite-plus/test";

import { createFlash } from "./flash.js";
import { isLoopback, OriginError, parseOrigin } from "./origin.js";
import { safeBack } from "./redirect.js";
import { SECURITY_HEADERS, withSecurityHeaders } from "./security.js";
import { parseTheme, readTheme, themeAttribute, themeCookie } from "./theme.js";

describe("flash", () => {
  const flash = createFlash({
    cookie: "app_flash",
    messages: {
      saved: { tone: "success", text: "Saved." },
      "signed-out": { tone: "info", text: "You are signed out." },
    },
  });

  test("carries a key, never text", () => {
    expect(flash.set("saved")).toBe(
      "app_flash=saved; Path=/; Max-Age=60; HttpOnly; Secure; SameSite=Lax",
    );
    expect(flash.peek("x=1; app_flash=saved")).toEqual({
      tone: "success",
      text: "Saved.",
    });
  });

  test("ignores unknown or injected keys", () => {
    expect(flash.peek("app_flash=<script>")).toBeNull();
    expect(flash.peek("app_flash=toString")).toBeNull();
    expect(flash.peek(null)).toBeNull();
    expect(() => flash.set("nope" as "saved")).toThrow();
  });

  test("clears", () => {
    expect(flash.clear({ secure: false })).toBe(
      "app_flash=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax",
    );
  });
});

describe("theme", () => {
  test("parses untrusted input to a known theme", () => {
    expect(parseTheme("dark")).toBe("dark");
    expect(parseTheme("purple")).toBe("system");
    expect(parseTheme(null)).toBe("system");
    expect(readTheme("t=light", "t")).toBe("light");
  });

  test("stores it for a year and maps it to data-theme", () => {
    expect(themeCookie("t", "dark")).toBe(
      "t=dark; Path=/; Max-Age=31536000; HttpOnly; Secure; SameSite=Lax",
    );
    expect(themeAttribute("system")).toBeUndefined();
    expect(themeAttribute("light")).toBe("light");
  });
});

describe("safeBack", () => {
  test("keeps same-origin paths", () => {
    expect(safeBack("/dashboard/family?page=2#x")).toBe(
      "/dashboard/family?page=2#x",
    );
  });

  test("refuses anything that could leave the site", () => {
    for (const bad of [
      "https://evil.example",
      "//evil.example",
      "/\\evil.example",
      "/\t/evil.example",
      "/\n/evil.example",
      "javascript:alert(1)",
      "dashboard",
      "",
      null,
      undefined,
      `/${"a".repeat(3000)}`,
    ]) {
      expect(safeBack(bad, "/home"), String(bad)).toBe("/home");
    }
  });
});

describe("parseOrigin", () => {
  test("accepts bare https origins", () => {
    expect(parseOrigin("X", "https://api.nyuchi.com/")).toBe(
      "https://api.nyuchi.com",
    );
    expect(parseOrigin("X", "https://api.nyuchi.com:8443")).toBe(
      "https://api.nyuchi.com:8443",
    );
  });

  test("refuses paths, queries, credentials, http and other schemes", () => {
    for (const bad of [
      "http://api.nyuchi.com",
      "https://api.nyuchi.com/v1",
      "https://api.nyuchi.com?x=1",
      "https://api.nyuchi.com/?",
      "https://api.nyuchi.com#x",
      "https://user:pw@api.nyuchi.com",
      "ftp://api.nyuchi.com",
      "api.nyuchi.com",
      "javascript:alert(1)",
    ]) {
      expect(() => parseOrigin("X", bad), bad).toThrow(OriginError);
    }
  });

  test("allows plain http only on loopback and, when asked, the private network", () => {
    expect(parseOrigin("X", "http://127.0.0.1:9000")).toBe(
      "http://127.0.0.1:9000",
    );
    expect(parseOrigin("X", "http://localhost:9000")).toBe(
      "http://localhost:9000",
    );
    expect(parseOrigin("X", "http://[::1]:9000")).toBe("http://[::1]:9000");
    expect(
      parseOrigin("X", "http://nyuchi-api.flycast", { privateNetworkOk: true }),
    ).toBe("http://nyuchi-api.flycast");
    expect(() => parseOrigin("X", "http://nyuchi-api.flycast")).toThrow(
      OriginError,
    );
    expect(() =>
      parseOrigin("X", "http://evil.example.internal.example.com", {
        privateNetworkOk: true,
      }),
    ).toThrow(OriginError);
  });

  test("names the setting in the error", () => {
    expect(() => parseOrigin("API_ORIGIN", "http://x.example")).toThrow(
      /^API_ORIGIN: must use https$/,
    );
    expect(isLoopback("127.1.2.3")).toBe(true);
    expect(isLoopback("128.0.0.1")).toBe(false);
  });
});

describe("withSecurityHeaders", () => {
  test("adds what is missing and keeps what the app set", () => {
    const r = withSecurityHeaders(
      new Response("ok", { headers: { "x-frame-options": "SAMEORIGIN" } }),
    );
    expect(r.headers.get("x-frame-options")).toBe("SAMEORIGIN");
    expect(r.headers.get("content-security-policy")).toBe(
      SECURITY_HEADERS["content-security-policy"],
    );
    expect(r.headers.get("cache-control")).toBeNull();
  });

  test("no-store when a cookie is set, and the CSP can be replaced or dropped", () => {
    const withCookie = new Response("ok", { headers: { "set-cookie": "a=1" } });
    expect(withSecurityHeaders(withCookie).headers.get("cache-control")).toBe(
      "no-store",
    );
    expect(
      withSecurityHeaders(new Response("ok"), { csp: false }).headers.has(
        "content-security-policy",
      ),
    ).toBe(false);
    expect(
      withSecurityHeaders(new Response("ok"), {
        csp: "default-src 'none'",
      }).headers.get("content-security-policy"),
    ).toBe("default-src 'none'");
  });

  test("works on an immutable redirect", () => {
    const r = withSecurityHeaders(
      Response.redirect("https://example.test/", 302),
    );
    expect(r.status).toBe(302);
    expect(r.headers.get("x-content-type-options")).toBe("nosniff");
  });
});
