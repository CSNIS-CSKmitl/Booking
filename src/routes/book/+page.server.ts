import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import PocketBase from "pocketbase";
import { env } from "$env/dynamic/private";
import { getUserRoles, isStudentRole, getAdvisorFieldMode, type AdvisorFieldMode } from "$lib/roles";

/**
 * หน้า /book ต้อง login ก่อนเสมอ — ถ้ายังไม่ได้ login ให้ redirect ไป /login
 * (เฉพาะหน้า book เท่านั้น หน้าอื่น เช่น room, dashboard เข้าได้ปกติ)
 */
export const load: PageServerLoad = async ({ locals, url }) => {
  if (!locals.user) {
    const redirectTo = url.pathname + url.search;
    throw redirect(302, `/login?redirect=${encodeURIComponent(redirectTo)}`);
  }

  let teachers: { id: string; name: string; email?: string }[] = [];
  try {
    const pbUrl =
      env.POCKETBASE_URL ??
      env.PUBLIC_POCKETBASE_URL ??
      "http://192.168.15.14:8080";
    const pb = new PocketBase(pbUrl);
    pb.autoCancellation(false);
    if (env.PB_ADMIN_EMAIL && env.PB_ADMIN_PASSWORD) {
      await pb.admins.authWithPassword(
        env.PB_ADMIN_EMAIL,
        env.PB_ADMIN_PASSWORD,
      );
    }
    const records = await pb.collection("users").getFullList({
      sort: "name",
      expand: "user_type",
      requestKey: null,
    });
    teachers = records
      .filter((u: any) => {
        const roles = getUserRoles(u);
        return roles.includes("teachers") || roles.includes("teacher");
      })
      .map((u: any) => ({
        id: u.id,
        name: String(u.name || u.username || u.email || "อาจารย์"),
        email: u.email || "",
      }));
  } catch (err) {
    console.error("[book/load] Failed to load teachers:", err);
  }

  const isStudent = isStudentRole(locals.user);
  const advisorMode: AdvisorFieldMode = getAdvisorFieldMode(locals.user);

  return {
    teachers,
    isStudent,
    advisorMode,
  };
};
