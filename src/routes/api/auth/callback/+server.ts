import { json, redirect } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import PocketBase from "pocketbase";
import { env } from "$env/dynamic/private";
import { dev } from "$app/environment";

const DEFAULT_USER_TYPE_ID = "000000000000001";

export const POST: RequestHandler = async ({ request, cookies }) => {
  const payload = await request.json().catch(() => null);
  if (!payload?.token || !payload?.record?.id) {
    return json({ ok: false, error: "invalid payload" }, { status: 400 });
  }

  let record = payload.record;

  // Auto-assign the default user_type on first-time OAuth login
  const hasNoRole =
    !record.user_type ||
    (Array.isArray(record.user_type) && record.user_type.length === 0);
  if (hasNoRole && env.PB_ADMIN_EMAIL && env.PB_ADMIN_PASSWORD) {
    try {
      const pbAdmin = new PocketBase(
        env.POCKETBASE_URL ??
          env.PUBLIC_POCKETBASE_URL ??
          "http://192.168.15.14:8080",
      );
      pbAdmin.autoCancellation(false);
      await pbAdmin.admins.authWithPassword(
        env.PB_ADMIN_EMAIL,
        env.PB_ADMIN_PASSWORD,
      );

      console.log(
        `[auth/callback] Assigning default user_type for new user: ${record.id}`,
      );
      const updated = await pbAdmin.collection("users").update(record.id, {
        user_type: DEFAULT_USER_TYPE_ID,
      });
      record = updated;
    } catch (e) {
      console.error("[auth/callback] Failed to set default user_type:", e);
    }
  }

  const cookiePayload = {
    token: payload.token,
    model: record,
  };

  cookies.set("pb_auth", JSON.stringify(cookiePayload), {
    path: "/",
    secure: !dev,
    httpOnly: false,
    maxAge: 60 * 60 * 24 * 7,
  });

  return json({ ok: true });
};

export const GET: RequestHandler = async () => {
  throw redirect(303, "/");
};
