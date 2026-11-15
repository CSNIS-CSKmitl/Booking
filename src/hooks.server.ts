import { getUserRoles, isBookingAdmin } from "$lib/roles";
import type { Handle } from "@sveltejs/kit";
import PocketBase from "pocketbase";
import { env } from "$env/dynamic/private";

type AuthUser = {
  id: string;
  email: string;
  name: string;
  username?: string;
  user_type?: string | string[];
  roles?: string[];
  isAdmin?: boolean;
};

type PbAuthCookie = {
  token: string;
  model?: {
    id?: string;
    email?: string;
    name?: string;
    username?: string;
    [k: string]: any;
  };
};

function decodeJwtPayload(
  token: string,
): { id?: string; exp?: number; [k: string]: any } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = parts[1];
    const padded = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padLen = (4 - (padded.length % 4)) % 4;
    const json = Buffer.from(padded + "=".repeat(padLen), "base64").toString(
      "utf-8",
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

const PB_URL = env.POCKETBASE_URL ?? env.PUBLIC_POCKETBASE_URL ?? "";
const PB_ADMIN_EMAIL = env.PB_ADMIN_EMAIL ?? "";
const PB_ADMIN_PASSWORD = env.PB_ADMIN_PASSWORD ?? "";

// cache 1 นาที กันยิง PB ซ้ำ
const userCache = new Map<string, { user: AuthUser; expires: number }>();
const CACHE_TTL_MS = 60_000;

// Admin PB client cache (ใช้ดึง user record เพราะ users collection rule มักแคบ)
// re-auth ทุก 5 นาที กัน token หมดอายุ
let adminPb: PocketBase | null = null;
let adminAuthTime = 0;
const ADMIN_AUTH_TTL_MS = 5 * 60 * 1000;

async function getAdminPb(): Promise<PocketBase | null> {
  if (!PB_URL || !PB_ADMIN_EMAIL || !PB_ADMIN_PASSWORD) return null;

  if (
    adminPb &&
    adminPb.authStore.isValid &&
    Date.now() - adminAuthTime < ADMIN_AUTH_TTL_MS
  ) {
    return adminPb;
  }

  adminPb = new PocketBase(PB_URL);
  adminPb.autoCancellation(false);
  try {
    await adminPb.admins.authWithPassword(PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD);
    adminAuthTime = Date.now();
    return adminPb;
  } catch (err) {
    console.warn(
      "[auth] Admin auth failed:",
      err instanceof Error ? err.message : err,
    );
    adminPb = null;
    return null;
  }
}

/** ดึง user record สดจาก PB (ใช้ admin auth เพราะ users collection rule มักจำกัด)
 *  ใช้ email แทน id เพราะ id ใน JWT บางทีไม่ตรงกับ record ใน users collection
 *  (เจอกรณี impersonate token id ไม่ตรง → getOne 404)
 */
async function fetchFreshUserFromPb(email: string): Promise<AuthUser | null> {
  const pb = await getAdminPb();
  if (!pb || !email) return null;

  try {
    // escape quote กัน filter injection
    const safe = email.replace(/"/g, '\\"');
    const fresh = await pb
      .collection("users")
      .getFirstListItem(`email = "${safe}"`, { expand: "user_type" });
    if (!fresh?.id || !fresh?.email) return null;
    return {
      id: fresh.id,
      email: fresh.email,
      name: fresh.name ?? "",
      username: fresh.username,
      user_type: fresh.user_type ?? "",
      roles: getUserRoles(fresh),
      isAdmin: isBookingAdmin(fresh, PB_ADMIN_EMAIL),
    };
  } catch (err) {
    // ลองค้นหาใน admins เผื่อเป็นผู้ดูแลระบบหลัก (PocketBase legacy Admin)
    try {
      const safe = email.replace(/"/g, '\\"');
      const adminList = await pb.admins.getList(1, 1, {
        filter: `email = "${safe}"`,
      });
      const admin = adminList.items[0];
      if (admin?.id && admin?.email) {
        return {
          id: admin.id,
          email: admin.email,
          name: "Administrator",
          username: "admin",
          user_type: "000000000000009",
          roles: ["superadmin", "super_admin"],
          isAdmin: true,
        };
      }
    } catch {
      // ละเว้นหากค้นหาใน admins ไม่พบเช่นกัน
    }

    console.warn(
      "[auth] PB re-fetch by email failed:",
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}

export const handle: Handle = async ({ event, resolve }) => {
  const raw = event.cookies.get("pb_auth");
  if (!raw) return resolve(event);

  let parsed: PbAuthCookie;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return resolve(event);
  }

  const token = parsed?.token;
  const model = parsed?.model;
  if (!token || !model?.id || !model.email) return resolve(event);

  // 1) ตรวจ token กับ PocketBase จริง (cache 1 นาที) — ห้ามเชื่อ cookie model โดยไม่ verify
  const cached = userCache.get(token);
  if (cached && cached.expires > Date.now()) {
    event.locals.user = cached.user;
    const response = await resolve(event);
    return response;
  }

  let user: AuthUser | null = null;
  if (PB_URL) {
    try {
      const pbVerify = new PocketBase(PB_URL);
      pbVerify.autoCancellation(false);
      pbVerify.authStore.save(token, null);
      const refreshed = await pbVerify
        .collection("users")
        .authRefresh({ expand: "user_type" });
      if (refreshed?.record?.id && refreshed?.record?.email) {
        const fresh = refreshed.record;
        user = {
          id: fresh.id,
          email: fresh.email,
          name: fresh.name ?? "",
          username: fresh.username,
          user_type: fresh.user_type ?? "",
          roles: getUserRoles(fresh),
          isAdmin: isBookingAdmin(fresh, PB_ADMIN_EMAIL),
        };
      }
    } catch {
      // ลองตรวจ legacy admin token เฉพาะกรณี admin
      try {
        const pbVerify = new PocketBase(PB_URL);
        pbVerify.autoCancellation(false);
        pbVerify.authStore.save(token, null);
        const adminRefreshed = await pbVerify.admins.authRefresh();
        if (adminRefreshed?.record?.id && adminRefreshed?.record?.email) {
          user = {
            id: adminRefreshed.record.id,
            email: adminRefreshed.record.email,
            name: "Administrator",
            username: "admin",
            user_type: "000000000000009",
            roles: ["superadmin", "super_admin"],
            isAdmin: true,
          };
        }
      } catch {
        user = null;
      }
    }
  }

  if (!user) {
    return resolve(event);
  }

  event.locals.user = user;
  userCache.set(token, { user, expires: Date.now() + CACHE_TTL_MS });
  const response = await resolve(event);
  return response;
};
