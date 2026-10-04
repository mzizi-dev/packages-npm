# @bundu/server

Server-side helpers for Bundu Ecosystem apps: the companion to
[`@bundu/ui`](https://www.npmjs.com/package/@bundu/ui), as Mzizi Roots pairs
`mzizi-roots` with `mzizi-roots-server`. Nyuchi's implementation of the
[Mzizi](https://mzizi.dev) design system.

It is framework-agnostic and has **no dependencies**: everything is built on
Web APIs (Web Crypto, `URL`, `Headers`, `Response`). The same code runs in
Astro server routes and middleware, in Node 20+, in Cloudflare Workers, in
Deno and in Bun. It holds no product-specific code: sign-in providers and API
clients belong to the app.

```sh
pnpm add @bundu/server
```

| Import                   | What it does                                                                                                           |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| `@bundu/server/seal`     | `createSealer(secret)`: AES-256-GCM sealed values bound to a purpose; `randomToken`, `pkceChallenge`                   |
| `@bundu/server/cookies`  | `serializeCookie` (safe defaults), `clearCookie`, `parseCookieHeader`, `getCookie`, `parseSetCookie`, `withSetCookies` |
| `@bundu/server/flash`    | `createFlash({ cookie, messages })`: one-shot messages across Post/Redirect/Get, carried as a key, never text          |
| `@bundu/server/theme`    | `parseTheme`, `readTheme`, `themeCookie`, `themeAttribute`: the system / light / dark preference                       |
| `@bundu/server/redirect` | `safeBack(value, fallback)`: a same-origin return path, or the fallback                                                |
| `@bundu/server/origin`   | `parseOrigin(setting, value)`: a bare `https` origin, http only on loopback or a named private network                 |
| `@bundu/server/security` | `withSecurityHeaders(response)`: CSP, `nosniff`, frame and referrer policy, `no-store` when a cookie is set            |
| `@bundu/server/table`    | `parseTableQuery`, `filterRows`, `paginate`, `withParams`: the URL-driven table state behind `DataTable`               |

Everything is also exported from `@bundu/server`.

## Sealed cookies

```ts
import { createSealer } from "@bundu/server/seal";
import { serializeCookie, getCookie } from "@bundu/server/cookies";

const sealer = createSealer(env.SESSION_SECRET); // at least 32 characters
const SESSION = "my-app/session/v1"; // the purpose: a value sealed for one never unseals as another

const cookie = serializeCookie("my_app_session", await sealer.seal(SESSION, { sub: "p_123" }), {
  maxAge: 60 * 60 * 24 * 30,
});
const session = await sealer.unseal<{ sub: string }>(SESSION, getCookie(request.headers.get("cookie"), "my_app_session"));
```

The wire format is the same as the Rust sealer (`seal.rs` in the Nyuchi console
backend): key = SHA-256(secret), base64url of a 12-byte nonce plus the ciphertext and
tag, with the purpose as associated data. A value sealed in Rust unseals here, and the
other way round. The tests carry a vector produced by the Rust side.

## In Astro middleware

```ts
import { defineMiddleware } from "astro:middleware";
import { createFlash } from "@bundu/server/flash";
import { isLocalUrl } from "@bundu/server/origin";
import { safeBack } from "@bundu/server/redirect";
import { withSecurityHeaders } from "@bundu/server/security";
import { readTheme } from "@bundu/server/theme";

export const flash = createFlash({
  cookie: "my_app_flash",
  messages: { saved: { tone: "success", text: "Saved." } },
});

export const onRequest = defineMiddleware(async ({ request, url, locals, redirect }, next) => {
  const cookies = request.headers.get("cookie");
  locals.theme = readTheme(cookies, "my_app_theme");
  locals.flash = flash.peek(cookies); // show it with @bundu/ui/app/Toast.astro
  if (url.pathname.startsWith("/account") && !(await signedIn(cookies))) {
    return redirect(`/sign-in?return_to=${encodeURIComponent(safeBack(url.pathname + url.search))}`);
  }
  const response = await next();
  if (locals.flash) response.headers.append("set-cookie", flash.clear({ secure: !isLocalUrl(url) }));
  return withSecurityHeaders(response, { csp: import.meta.env.DEV ? false : undefined });
});
```

## Licence

[MIT](https://github.com/mzizi-dev/packages-npm/blob/main/LICENSE) © Nyuchi Africa (Pvt) Ltd.
