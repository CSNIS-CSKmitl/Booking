import { redirect, error, isRedirect } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import PocketBase from "pocketbase";
import { env } from "$env/dynamic/private";
import { dev } from "$app/environment";

export const GET: RequestHandler = async ({ url, cookies }) => {
  const pbUrl =
    env.POCKETBASE_URL ??
    env.PUBLIC_POCKETBASE_URL ??
    "http://192.168.15.14:8080";
  const pb = new PocketBase(pbUrl);
  pb.autoCancellation(false);

  try {
    const authMethods = await pb.collection("users").listAuthMethods();
    const oidcProvider = authMethods.oauth2?.providers?.find(
      (p) => p.name === "oidc",
    );
    if (!oidcProvider) {
      throw error(500, "OIDC provider is not configured in PocketBase");
    }

    const redirectUri =
      env.PUBLIC_KMITL_REDIRECT_URI ?? `${url.origin}/auth/callback`;

    // Store the state & codeVerifier in cookies for callback verification
    cookies.set("pb_oauth_state", oidcProvider.state, {
      path: "/",
      httpOnly: true,
      secure: !dev,
      maxAge: 300,
      sameSite: "lax",
    });
    cookies.set("pb_oauth_verifier", oidcProvider.codeVerifier, {
      path: "/",
      httpOnly: true,
      secure: !dev,
      maxAge: 300,
      sameSite: "lax",
    });

    // Keep track of where to redirect after successful login
    const next = url.searchParams.get("redirect") || "/book";
    cookies.set("pb_oauth_next", next, {
      path: "/",
      httpOnly: true,
      secure: !dev,
      maxAge: 300,
      sameSite: "lax",
    });

    // Override redirect_uri in authUrl to our SvelteKit callback
    const targetUrl = new URL(oidcProvider.authURL);
    targetUrl.searchParams.set("redirect_uri", redirectUri);

    throw redirect(302, targetUrl.toString());
  } catch (err) {
    if (isRedirect(err)) {
      throw err;
    }
    console.error("[auth/login] Failed to initiate OIDC:", err);
    throw error(500, "Failed to initiate OIDC login flow");
  }
};
