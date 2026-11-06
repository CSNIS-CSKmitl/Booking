import { redirect } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

const POST: RequestHandler = async ({ cookies }) => {
  cookies.delete("pb_auth", { path: "/" });
  throw redirect(303, "/login");
};

// logout ใช้ได้ทั้ง GET (กดลิงก์) และ POST (submit form)
export { POST };
export const GET = POST;
