import PocketBase from "pocketbase";
import { env } from "$env/dynamic/private";

// Singleton for the logger PB client
let logPb: PocketBase | null = null;

export async function getLoggerPb(): Promise<PocketBase> {
  const PB_URL = env.POCKETBASE_URL ?? env.PUBLIC_POCKETBASE_URL ?? "";
  const PB_USER_EMAIL = env.PB_USER_EMAIL ?? "log@cskmitl.com";
  const PB_USER_PASSWORD = env.PB_USER_PASSWORD ?? "";

  if (!PB_URL || !PB_USER_PASSWORD) {
    throw new Error(
      "Logger PB is not fully configured (missing POCKETBASE_URL or PB_USER_PASSWORD)",
    );
  }

  // Reuse valid auth connection
  if (logPb && logPb.authStore.isValid) {
    return logPb;
  }

  logPb = new PocketBase(PB_URL);
  logPb.autoCancellation(false);

  try {
    // Authenticate specifically as the log user so the rule `@request.auth.email = 'log@cskmitl.com'` passes
    await logPb
      .collection("users")
      .authWithPassword(PB_USER_EMAIL, PB_USER_PASSWORD);
  } catch (err) {
    console.error("❌ Logger Auth Failed:", err);
    throw new Error("Logger authentication failed");
  }

  return logPb;
}

export type LogEventData = {
  event_type: string;
  result: "success" | "fail";
  user_id?: string;
  user_type?: string;
  auth_source?: "local" | "google";
  client_ip?: string;
  mac_addr?: string;
  session_id?: string;
  zone_id?: number;
  error_code?: string;
  gateway_id?: string;
};

export async function createLog(data: LogEventData): Promise<void> {
  try {
    const pb = await getLoggerPb();

    // Prepare data with correct types according to the Logs schema
    const logPayload = {
      ...data,
      // PocketBase expects dates in ISO format. To prevent Internal Errors, use standard ISO string.
      event_time: new Date().toISOString(),
    };

    // If relations are provided as empty strings, convert them to undefined/null to prevent relation errors
    if (!logPayload.user_id) delete logPayload.user_id;
    if (!logPayload.user_type) delete logPayload.user_type;

    await pb.collection("Logs").create(logPayload);
  } catch (error: any) {
    console.error(
      "❌ Failed to create log:",
      error?.response || error?.message || error,
    );
  }
}
