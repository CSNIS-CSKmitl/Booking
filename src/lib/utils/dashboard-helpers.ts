import type { Room, Booking } from "$lib/types";

const SAFE_ID_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;
const CALENDAR_CELLS = 42; // 6 weeks × 7 days

const BANGKOK_TIME_FORMAT = new Intl.DateTimeFormat("th-TH", {
	timeZone: "Asia/Bangkok",
	hour: "2-digit",
	minute: "2-digit",
	hour12: false,
	hourCycle: "h23",
});

const BANGKOK_DATE_FORMAT = new Intl.DateTimeFormat("en-CA", {
	timeZone: "Asia/Bangkok",
});

/** Parse PocketBase timestamps consistently as Bangkok time when no offset is stored. */
export function parseBookingTimestamp(value: string): number {
	if (!value) return Number.NaN;
	const normalized = String(value).trim().replace(" ", "T");
	const hasTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(normalized);
	return Date.parse(hasTimezone ? normalized : `${normalized}+07:00`);
}

/** ตรวจสอบ ID ห้องป้องการการเข้าถึงที่ไม่ถูกต้อง */
export function isValidRoomId(id: string | undefined): id is string {
	return typeof id === "string" && SAFE_ID_PATTERN.test(id);
}

/** ป้องกัน filter injection สำหรับ PocketBase */
export function escapeFilterValue(value: string): string {
	return value.replace(/[\\"'\n\r\t]/g, "\\$&");
}

/** แปลงเวลา UTC เป็นเวลาไทยรูปแบบ HH:MM */
export function formatToBangkokTime(utcTimeString: string): string {
	if (!utcTimeString) return "--:--";
	try {
		const timestamp = parseBookingTimestamp(utcTimeString);
		if (!Number.isFinite(timestamp)) return "--:--";
		return BANGKOK_TIME_FORMAT.format(new Date(timestamp));
	} catch {
		return "--:--";
	}
}

/** แปลงวันเวลา UTC เป็นวันที่ไทยรูปแบบ YYYY-MM-DD */
export function formatToBangkokDate(utcTimeString: string): string {
	if (!utcTimeString) return "";
	const timestamp = parseBookingTimestamp(utcTimeString);
	return Number.isFinite(timestamp)
		? BANGKOK_DATE_FORMAT.format(new Date(timestamp))
		: "";
}

/** สร้างโครงสร้างตารางปฏิทินแบบ 42 ช่องสำหรับการแสดงผลรายเดือน */
export function generateMonthGridStructure(
	roomsList: Room[],
	bookingsList: Booking[],
	selectedYear: number,
	selectedMonth: number,
	currentRoomId: string
) {
	const firstDayOfMonth = new Date(selectedYear, selectedMonth, 1);
	const startOffset = firstDayOfMonth.getDay();
	const startDate = new Date(firstDayOfMonth);
	startDate.setDate(startDate.getDate() - startOffset);

	const daysArray: any[] = [];
	const todayStr = BANGKOK_DATE_FORMAT.format(new Date());

	for (let i = 0; i < CALENDAR_CELLS; i++) {
		const currentLoopDate = new Date(startDate);
		currentLoopDate.setDate(startDate.getDate() + i);

		const dateStrKey = `${currentLoopDate.getFullYear()}-${String(currentLoopDate.getMonth() + 1).padStart(2, "0")}-${String(currentLoopDate.getDate()).padStart(2, "0")}`;
		const isCurrentMonth = currentLoopDate.getMonth() === selectedMonth;

		const cellStartEpoch = Date.parse(`${dateStrKey}T00:00:00+07:00`);
		const cellEndEpoch = Date.parse(`${dateStrKey}T23:59:59+07:00`);

		const matchedBookings = bookingsList
			.filter((b) => {
				if (!b.start_time || !b.end_time) return false;

				try {
					const bookingStartEpoch = parseBookingTimestamp(b.start_time);
					const bookingEndEpoch = parseBookingTimestamp(b.end_time);
					if (!Number.isFinite(bookingStartEpoch) || !Number.isFinite(bookingEndEpoch)) return false;

					const isOverlapping =
						bookingStartEpoch <= cellEndEpoch &&
						bookingEndEpoch >= cellStartEpoch;
					const isStatusValid =
						b.status === "approved" || b.status === "confirmed";
					const isThisRoom = b.field === currentRoomId;

					return isOverlapping && isStatusValid && isThisRoom;
				} catch (e) {
					return false;
				}
			})
			.sort(
				(a, b) =>
				parseBookingTimestamp(a.start_time) -
					parseBookingTimestamp(b.start_time),
			)
			.map((b) => {
				const roomInfo = roomsList.find((r) => r.id === b.field);
				const startTimeTH = formatToBangkokTime(b.start_time);
				const endTimeTH = formatToBangkokTime(b.end_time);

				const bookingStartDateOnly = formatToBangkokDate(b.start_time);
				const bookingEndDateOnly = formatToBangkokDate(b.end_time);

				let displayTime = `${startTimeTH} - ${endTimeTH}`;
				if (
					bookingStartDateOnly !== dateStrKey &&
					bookingEndDateOnly === dateStrKey
				) {
					displayTime = `จนถึง ${endTimeTH}`;
				} else if (
					bookingStartDateOnly === dateStrKey &&
					bookingEndDateOnly !== dateStrKey
				) {
					displayTime = `${startTimeTH} ➔ ข้ามวัน`;
				} else if (
					bookingStartDateOnly !== dateStrKey &&
					bookingEndDateOnly !== dateStrKey
				) {
					displayTime = `จองทั้งวัน ➔`;
				}

				return {
					id: b.id,
					title: b.title || "Untitled",
					time: displayTime,
					roomName: roomInfo ? roomInfo.name : "Unknown Room",
					bookerName: b.bookerName ?? "",
					bookerEmail: b.bookerEmail ?? "",
					detailLabel: b.detailLabel ?? "",
				};
			});

		daysArray.push({
			dateKey: dateStrKey,
			dayNumber: currentLoopDate.getDate(),
			isCurrentMonth,
			isToday: dateStrKey === todayStr,
			bookings: matchedBookings,
		});
	}
	return daysArray;
}
