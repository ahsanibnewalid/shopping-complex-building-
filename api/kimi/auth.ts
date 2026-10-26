import type { Context } from "hono";
import { setCookie } from "hono/cookie";
import * as jose from "jose";
import * as cookie from "cookie";
import { createOAuthState, matchesOAuthState } from "../lib/oauth-state";
import { env } from "../lib/env";
import { getSessionCookieOptions } from "../lib/cookies";
import { Session, Paths } from "@contracts/constants";
import { Errors } from "@contracts/errors";
import { signSessionToken, verifySessionToken } from "./session";
import { users as kimiUsers } from "./platform";
import { findUserByUnionId, upsertUser } from "../queries/users";
import type { TokenResponse } from "./types";

const OAUTH_STATE_COOKIE = "bazarhub_oauth_state";

function oauthRedirectUri(): string {
  if (!env.appBaseUrl) {
    throw new Error("APP_BASE_URL must be configured for OAuth");
  }
  const base = new URL(env.appBaseUrl);
  if (env.isProduction && base.protocol !== "https:") {
    throw new Error("APP_BASE_URL must use HTTPS in production");
  }
  return new URL(Paths.oauthCallback, base.origin).toString();
}

async function exchangeAuthCode(
  code: string,
  redirectUri: string,
): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: env.appId,
    redirect_uri: redirectUri,
    client_secret: env.appSecret,
  });

  const resp = await fetch(`${env.kimiAuthUrl}/api/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
    signal: AbortSignal.timeout(15_000),
  });

  if (!resp.ok) {
    throw new Error(`Token exchange failed (${resp.status})`);
  }

  return resp.json() as Promise<TokenResponse>;
}

const jwks = jose.createRemoteJWKSet(
  new URL(`${env.kimiAuthUrl}/api/.well-known/jwks.json`),
);

async function verifyAccessToken(
  accessToken: string,
): Promise<{ userId: string; clientId: string }> {
  const { payload } = await jose.jwtVerify(accessToken, jwks);
  const userId = payload.user_id as string;
  const clientId = payload.client_id as string;
  if (!userId || clientId !== env.appId) {
    throw new Error("Access token subject or client does not match this application");
  }
  return { userId, clientId };
}

export async function authenticateRequest(headers: Headers) {
  const cookies = cookie.parse(headers.get("cookie") || "");
  const token = cookies[Session.cookieName];
  if (!token) {
    throw Errors.forbidden("Invalid authentication token.");
  }
  const claim = await verifySessionToken(token);
  if (!claim) {
    throw Errors.forbidden("Invalid authentication token.");
  }
  const user = await findUserByUnionId(claim.unionId);
  if (!user) {
    throw Errors.forbidden("User not found. Please re-login.");
  }
  return user;
}

export function createOAuthStartHandler() {
  return async (c: Context) => {
    try {
      const redirectUri = oauthRedirectUri();
      const state = createOAuthState();
      const authorizeUrl = new URL("/api/oauth/authorize", env.kimiAuthUrl);
      authorizeUrl.searchParams.set("client_id", env.appId);
      authorizeUrl.searchParams.set("redirect_uri", redirectUri);
      authorizeUrl.searchParams.set("response_type", "code");
      authorizeUrl.searchParams.set("scope", "profile");
      authorizeUrl.searchParams.set("state", state);

      setCookie(c, OAUTH_STATE_COOKIE, state, {
        httpOnly: true,
        secure: env.isProduction,
        sameSite: "Lax",
        path: Paths.oauthCallback,
        maxAge: 300,
      });
      return c.redirect(authorizeUrl.toString(), 302);
    } catch {
      return c.json({ error: "OAuth is not configured correctly" }, 503);
    }
  };
}

export function createOAuthCallbackHandler() {
  return async (c: Context) => {
    const code = c.req.query("code");
    const state = c.req.query("state");
    const error = c.req.query("error");

    if (error) {
      setCookie(c, OAUTH_STATE_COOKIE, "", {
        httpOnly: true, secure: env.isProduction, sameSite: "Lax",
        path: Paths.oauthCallback, maxAge: 0,
      });
      if (error === "access_denied") return c.redirect("/", 302);
      return c.json({ error: "OAuth authorization failed" }, 400);
    }

    if (!code || !state || state.length > 256) {
      return c.json({ error: "Invalid OAuth callback" }, 400);
    }

    const cookies = cookie.parse(c.req.header("cookie") || "");
    const expectedState = cookies[OAUTH_STATE_COOKIE] || "";
    const stateMatches = matchesOAuthState(expectedState, state);

    setCookie(c, OAUTH_STATE_COOKIE, "", {
      httpOnly: true, secure: env.isProduction, sameSite: "Lax",
      path: Paths.oauthCallback, maxAge: 0,
    });

    if (!stateMatches) {
      return c.json({ error: "OAuth state validation failed. Please sign in again." }, 400);
    }

    try {
      const tokenResp = await exchangeAuthCode(code, oauthRedirectUri());
      const { userId } = await verifyAccessToken(tokenResp.access_token);
      const userProfile = await kimiUsers.getProfile(tokenResp.access_token);
      if (!userProfile) {
        throw new Error("Failed to fetch user profile from Kimi Open");
      }

      await upsertUser({
        unionId: userId,
        name: userProfile.name,
        avatar: userProfile.avatar_url,
        lastSignInAt: new Date(),
      });

      const token = await signSessionToken({
        unionId: userId,
        clientId: env.appId,
      });

      const cookieOpts = getSessionCookieOptions(c.req.raw.headers);
      setCookie(c, Session.cookieName, token, {
        ...cookieOpts,
        maxAge: Session.maxAgeMs / 1000,
      });

      return c.redirect("/", 302);
    } catch {
      return c.json({ error: "OAuth callback failed" }, 502);
    }
  };
}

export { exchangeAuthCode, verifyAccessToken };
