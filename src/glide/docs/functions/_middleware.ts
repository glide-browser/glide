// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

// @ts-nocheck
/**
 * Entirely AI generated as I'm just going to delete this soon anyway.
 */
import type { PagesFunction } from "@cloudflare/workers-types";

/** ---- tweak these two constants to taste ---- */
const PASSWORD = "fuckchrome"; // the one hard-coded password
const COOKIE = "AUTH_OK"; // cookie name we will set
const COOKIE_TTL_DAYS = 7; // keep the user logged-in for a week
/** ------------------------------------------- */

export const onRequest: PagesFunction = async ctx => {
  const { request, next } = ctx;
  const url = new URL(request.url);

  /* ------------------------------------------------------------------ */
  /* 1️⃣  if the user is already authenticated, let the request through */
  /* ------------------------------------------------------------------ */
  const cookies = Object.fromEntries(
    (request.headers.get("cookie") ?? "")
      .split(/;\s*/)
      .filter(Boolean)
      .map(c => c.split("=", 2) as [string, string]),
  );
  if (cookies[COOKIE] === "1") {
    return next(); // 👉  run the rest of the pipeline
  }

  /* ------------------------------------------------------------------ */
  /* 2️⃣  handle POSTs to /_login (form submissions)                    */
  /* ------------------------------------------------------------------ */
  if (url.pathname === "/_login" && request.method === "POST") {
    const form = await request.formData();
    const pw = form.get("password")?.toString() ?? "";

    if (pw === PASSWORD) {
      const inOneWeek = new Date(Date.now() + COOKIE_TTL_DAYS * 86_400_000).toUTCString();
      return new Response(null, {
        status: 302,
        headers: {
          Location: form.get("return")?.toString() || "/", // go back
          "Set-Cookie": `${COOKIE}=1; Expires=${inOneWeek}; Path=/; `
            + "HttpOnly; SameSite=Lax; Secure",
        },
      });
    }
    // wrong password - fall through to render form with error message
    url.searchParams.set("error", "1");
  }

  /* ------------------------------------------------------------------ */
  /* 3️⃣  not logged-in → show the password page                        */
  /* ------------------------------------------------------------------ */
  const err = url.searchParams.get("error") === "1";
  const returnTo = encodeURIComponent(url.pathname + url.search);

  const html = /* HTML */ ` <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <title>Login</title>
        <style>
          body {
            font-family: system-ui;
            background: #f7f7f7;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
          }
          form {
            background: #fff;
            padding: 2rem 3rem;
            border-radius: 12px;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
            display: grid;
            gap: 1rem;
            min-width: 280px;
          }
          input {
            padding: 0.6rem 0.8rem;
            border: 1px solid #ccc;
            border-radius: 6px;
            font-size: 1rem;
          }
          button {
            padding: 0.6rem 1rem;
            border: 0;
            border-radius: 6px;
            font-size: 1rem;
            cursor: pointer;
            background: #1d4ed8;
            color: #fff;
          }
          .error {
            color: #b91c1c;
          }
        </style>
      </head>
      <body>
        <form method="POST" action="/_login">
          <h2 style="margin:0 0 .5rem">Password</h2>
          ${
    err
      ? "<div class=\"error\">Incorrect password – try again.</div>"
      : ""
  }
          <input
            type="password"
            name="password"
            placeholder="Password"
            autocomplete="current-password"
            required
          />
          <input type="hidden" name="return" value="${returnTo}" />
          <button type="submit">Enter</button>
        </form>
      </body>
    </html>`;

  return new Response(html, { status: err ? 401 : 200, headers: { "Content-Type": "text/html;charset=UTF-8" } });
};
