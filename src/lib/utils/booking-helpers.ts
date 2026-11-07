import type { Booking } from "$lib/types";

const BANGKOK_DATE_FORMAT = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Bangkok",
});

const SAFE_ID_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;

/** แปลง ISO datetime เป็น YYYY-MM-DD ใน Asia/Bangkok */
export function getBookingDateInBangkok(iso: string): string {
  try {
    return BANGKOK_DATE_FORMAT.format(new Date(iso.replace(" ", "T")));
  } catch {
    return "";
  }
}

/** ตรวจสอบความถูกต้องของ ID ห้อง */
export function isValidRoomId(id: string): boolean {
  return typeof id === "string" && SAFE_ID_PATTERN.test(id);
}

/** ดึงวันที่วันนี้ใน timezone Bangkok */
export function getTodayDate(): string {
  return BANGKOK_DATE_FORMAT.format(new Date());
}

/** แปลงข้อมูลวันและชั่วโมงเป็น Bangkok ISO String */
export function toBangkokIso(dateStr: string, hhmm: string): string {
  return `${dateStr}T${hhmm}:00+07:00`;
}

/** Format เวลาแสดงผลเป็น HH:MM (Bangkok) */
export function formatDisplayTime(value: string): string {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Bangkok",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      hourCycle: "h23",
    }).format(new Date(value.replace(" ", "T")));
  } catch {
    return value;
  }
}

/** ตรวจสอบการจองซ้อนทับกัน (Conflict check) */
export function checkOverlap(
  bookings: Booking[],
  bookingDate: string,
  startTime: string,
  endTime: string,
): Booking | null {
  const newStartMs = Date.parse(toBangkokIso(bookingDate, startTime));
  const newEndMs = Date.parse(toBangkokIso(bookingDate, endTime));

  for (const b of bookings) {
    if (b.status === "cancelled") continue;
    const bsMs = Date.parse(b.start_time.replace(" ", "T"));
    const beMs = Date.parse(b.end_time.replace(" ", "T"));
    if (Number.isNaN(bsMs) || Number.isNaN(beMs)) continue;

    const overlap = newStartMs < beMs && newEndMs > bsMs;
    if (overlap) return b;
  }
  return null;
}

/** ตรวจสอบความถูกต้องของฟอร์ม (Validation) */
export function validateForm(fields: {
  selectedRoomId: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  title: string;
  advisorName?: string;
  isStudent?: boolean;
  isRecurring: boolean;
  recurringUntil: string;
  recurringDays: number[];
}): string | null {
  const {
    selectedRoomId,
    bookingDate,
    startTime,
    endTime,
    title,
    advisorName,
    isRecurring,
    recurringUntil,
    recurringDays,
  } = fields;

  if (!selectedRoomId) return "กรุณาเลือกห้องประชุม";
  if (!isValidRoomId(selectedRoomId)) return "รหัสห้องไม่ถูกต้อง";
  if (!bookingDate) return "กรุณาเลือกวันที่ต้องการจอง";
  if (!startTime || !endTime) return "กรุณาระบุเวลาเริ่มและเวลาสิ้นสุด";
  if (startTime >= endTime) return "เวลาเริ่มต้องน้อยกว่าเวลาจบ";
  if (!title.trim()) return "กรุณากรอกหัวข้อการจอง";
  if (fields.isStudent && (!advisorName || !advisorName.trim())) {
    return "กรุณาเลือกอาจารย์ที่ปรึกษา";
  }
  if (isRecurring) {
    if (!recurringUntil) return "กรุณาระบุวันที่สิ้นสุดการจองซ้ำ";
    if (recurringUntil < bookingDate)
      return "วันที่สิ้นสุดต้องอยู่หลังวันที่เริ่มต้น";
    if (recurringDays.length === 0)
      return "กรุณาเลือกวันในสัปดาห์ที่ต้องการจองซ้ำ";
  }
  return null;
}
