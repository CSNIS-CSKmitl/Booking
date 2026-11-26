import { env } from "$env/dynamic/public";
import PocketBase from "pocketbase";

export const pb = new PocketBase(env.PUBLIC_POCKETBASE_URL);

/**
 * อ่าน pb_auth cookie (ที่ตั้งตอน /auth/callback) แล้วยัด token+model ลง PocketBase client
 * เพื่อให้ query ผ่าน listRule ที่ต้อง authenticate
 *
 * ใช้: หลัง `new PocketBase(url)` ทุกหน้าที่ fetch bookings
 * @returns true ถ้า auth สำเร็จ, false ถ้าไม่มี cookie / parse พัง / รันฝั่ง server
 */
export function authenticatePbFromCookie(pbInstance: PocketBase): boolean {
  if (typeof document === "undefined") return false;

  const cookie = document.cookie
    .split("; ")
    .find((c) => c.startsWith("pb_auth="));
  if (!cookie) return false;

  try {
    const json = decodeURIComponent(cookie.slice("pb_auth=".length));
    const parsed = JSON.parse(json);
    if (parsed?.token && parsed?.model) {
      pbInstance.authStore.save(parsed.token, parsed.model);
      return true;
    }
  } catch (err) {
    console.warn("[pb] Failed to parse pb_auth cookie:", err);
  }
  return false;
}

// ฟังก์ชันนี้จะรันบนเซิร์ฟเวอร์เท่านั้นเพื่อแลก Token
