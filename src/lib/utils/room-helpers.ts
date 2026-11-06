import type { BookingItem, RoomItem, BookingRecord } from "$lib/types";

const SAFE_ID_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;

/** ตรวจสอบ ID ห้องป้องการการเข้าถึงที่ไม่ถูกต้อง */
export function isValidRoomId(id: string | undefined): id is string {
  return typeof id === "string" && SAFE_ID_PATTERN.test(id);
}

/** ป้องกัน filter injection สำหรับ PocketBase */
export function escapeFilterValue(value: string): string {
  return value.replace(/[\\"'\n\r\t]/g, "\\$&");
}

/** หาคีย์รูปแบบ YYYY-MM-DD ตามเขตเวลาเอเชีย/กรุงเทพ */
export function getBangkokDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value ?? "1970";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";

  return `${year}-${month}-${day}`;
}

/** แปลงเวลาไทย HH:MM เป็น Epoch Milliseconds */
export function parseBangkokTimeToEpoch(value: string) {
  const hhmm = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!hhmm) return null;

  const hours = Number(hhmm[1]);
  const minutes = Number(hhmm[2]);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;

  const dateKey = getBangkokDateKey();
  const isoLike = `${dateKey}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00+07:00`;
  const parsed = Date.parse(isoLike);
  return Number.isNaN(parsed) ? null : parsed;
}

/** แปลงข้อมูลวันเวลาที่รับมาเป็น Epoch Milliseconds */
export function parseTimeToEpoch(value: string): number | null {
  if (!value) return null;

  const hhmm = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (hhmm) {
    return parseBangkokTimeToEpoch(value);
  }

  const normalized = String(value).replace(" ", "T");
  const parsed = Date.parse(normalized);
  return Number.isNaN(parsed) ? null : parsed;
}

/** ปรับแต่งรูปแบบเวลาเพื่อแสดงผล (HH:MM) */
export function formatDisplayTime(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) return "--:--";
  const trimmed = value.trim();
  if (/^\d{1,2}:\d{2}$/.test(trimmed)) return trimmed;

  const normalized = trimmed.replace(" ", "T");
  const parsed = Date.parse(normalized);
  if (Number.isNaN(parsed)) return trimmed;

  return new Date(parsed).toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    hourCycle: "h23",
  });
}

/** แมปข้อมูลประวัติการจองจาก PocketBase Record */
export function mapRecord(record: BookingRecord): BookingItem {
  const rawStatus = String(record.status ?? "pending");
  const status: BookingItem["status"] =
    rawStatus === "pending" || rawStatus === "cancelled"
      ? rawStatus
      : "confirmed";
  const bookingDetail = String(record.detailLabel ?? "").trim();
  const expandedFieldName = String(record.expand?.field?.name ?? "").trim();
  const detailLabel =
    bookingDetail ||
    expandedFieldName ||
    String(record.field ?? "Unknown room");
  const bookerName = String(record.bookerName ?? "").trim();
  const bookerEmail = String(
    record.bookerEmail ?? record.booker_email ?? "",
  ).trim();
  const startRaw = String(record.start_time ?? "");
  const endRaw = String(record.end_time ?? "");

  return {
    id: String(record.id ?? crypto.randomUUID()),
    title: String(record.title ?? "Untitled booking"),
    detailLabel,
    bookerName,
    bookerEmail,
    booker_email: bookerEmail,
    startTime: formatDisplayTime(startRaw),
    startEpoch: parseTimeToEpoch(startRaw),
    endTime: formatDisplayTime(endRaw),
    endEpoch: parseTimeToEpoch(endRaw),
    status,
  };
}

/** แมปข้อมูลรายละเอียดห้องจาก PocketBase Record */
export function mapRoom(
  record: Record<string, unknown>,
  defaultRoomName: string,
  defaultRoomLocation: string,
  defaultBookingUrl: string,
): RoomItem {
  return {
    name: String(record.name ?? defaultRoomName),
    location: String(record.location ?? defaultRoomLocation),
    booking_url: String(record.booking_url ?? defaultBookingUrl),
  };
}

/** คำนวณหา Derived State ของห้องในปัจจุบัน (ความก้าวหน้าการประชุม, ข้อมูลการจองถัดไป, รายการจองวันนี้) */
export function calculateDerivedState(
  now: number,
  bookings: BookingItem[],
  currentRoomId: string,
): {
  bookingViewState: "active" | "idle";
  currentBooking: BookingItem;
  upcomingBookings: BookingItem[];
  progressPercent: number;
  progressNote: string;
} {
  const todayKey = getBangkokDateKey(new Date(now));

  const todaysBookings = bookings
    .filter((b) => {
      if (!b.startEpoch) return false;
      if (b.status === "cancelled" || b.status === "pending") return false;
      return getBangkokDateKey(new Date(b.startEpoch)) === todayKey;
    })
    .sort((a, b) => (a.startEpoch ?? 0) - (b.startEpoch ?? 0));

  const activeBooking = todaysBookings.find((b) => {
    if (!b.startEpoch || !b.endEpoch) return false;
    return now >= b.startEpoch && now < b.endEpoch;
  });

  const nextBookings = todaysBookings.filter((b) => {
    if (!b.endEpoch) return false;
    return b.endEpoch > now;
  });

  const bookingViewState = activeBooking ? "active" : "idle";

  const displayBooking =
    activeBooking ??
    nextBookings[0] ??
    todaysBookings[todaysBookings.length - 1];

  const currentBooking = displayBooking ?? {
    id: "empty",
    title: "ว่าง",
    detailLabel: "-",
    startTime: "",
    endTime: "",
    status: "cancelled",
    bookerName: "-",
  };

  const upcomingBookings = activeBooking
    ? nextBookings.filter((b) => b.id !== activeBooking.id)
    : nextBookings;

  let progressPercent = 0;
  let progressNote = "";

  if (currentBooking.id === "empty" || !currentBooking.startEpoch) {
    progressPercent = 0;
    progressNote = "ห้องว่างและพร้อมใช้งาน";
  } else {
    const start = currentBooking.startEpoch;
    const end = currentBooking.endEpoch ?? now;

    if (end > start) {
      const pct = ((now - start) / (end - start)) * 100;
      progressPercent = Math.max(0, Math.min(100, Math.round(pct)));
      const minsLeft = Math.ceil((end - now) / 60000);

      if (minsLeft > 60) {
        const hoursLeft = Math.floor(minsLeft / 60);
        const remMins = minsLeft % 60;
        progressNote = `เหลือเวลาอีก ${hoursLeft} ชม. ${remMins} นาที`;
      } else if (minsLeft > 0) {
        progressNote = `เหลือเวลาอีก ${minsLeft} นาที`;
      } else {
        progressNote = "กำลังจะเริ่มประชุมถัดไป";
      }
    } else {
      progressPercent = 0;
      progressNote = "กำลังใช้งานห้องประชุม";
    }
  }

  return {
    bookingViewState,
    currentBooking,
    upcomingBookings,
    progressPercent,
    progressNote,
  };
}
