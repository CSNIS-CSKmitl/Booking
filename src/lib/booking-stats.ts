export type BookingTimeRange = 'today' | '7d' | 'month' | 'year' | 'all';

export type BookingDrilldownFilter =
	| 'all'
	| 'active'
	| 'upcoming'
	| 'cancelled'
	| `room:${string}`;

export interface StatsRoomInput {
	id: string;
	name: string;
	location?: string;
}

export interface StatsBookingInput {
	id: string;
	title?: string;
	field?: string;
	roomName?: string;
	location?: string;
	start_time?: string;
	end_time?: string;
	created?: string;
	status?: string;
	bookerName?: string;
	advisorName?: string;
	detailLabel?: string;
	bookerEmail?: string;
	booker_email?: string;
	createdBy?: string;
	updatedBy?: string;
	approvedBy?: string;
}

export interface BookingTrendBucket {
	key: string;
	label: string;
	count: number;
	activeCount: number;
	cancelledCount: number;
	hours: number;
}

export interface PeakHourInfo {
	hour: number;
	slot: string;
	count: number;
}

export interface MostBookedRoomInfo {
	id: string;
	name: string;
	count: number;
	hours: number;
}

export interface ComputedBookingStats {
	range: BookingTimeRange;
	totalBookings: number;
	total: number; // active (non-cancelled) bookings in range
	active: number;
	upcoming: number;
	month: number;
	cancelled: number;
	bookers: number;
	rooms: number;
	totalHours: number;
	cancellationRate: number;
	peakHour: PeakHourInfo | null;
	mostBookedRoom: MostBookedRoomInfo | null;
	topRoom: string;
	trend: BookingTrendBucket[];
	generatedAt: string;
}

export const BOOKING_TIME_RANGES: ReadonlyArray<{ value: BookingTimeRange; label: string }> = [
	{ value: 'today', label: 'วันนี้' },
	{ value: '7d', label: '7 วัน' },
	{ value: 'month', label: 'เดือนนี้' },
	{ value: 'year', label: 'ปีนี้' },
	{ value: 'all', label: 'ทั้งหมด' }
];

const THAI_SHORT_MONTHS = [
	'ม.ค.',
	'ก.พ.',
	'มี.ค.',
	'เม.ย.',
	'พ.ค.',
	'มิ.ย.',
	'ก.ค.',
	'ส.ค.',
	'ก.ย.',
	'ต.ค.',
	'พ.ย.',
	'ธ.ค.'
];

export function parseBookingDate(value: unknown): Date | null {
	if (!value) return null;
	if (value instanceof Date) {
		return Number.isNaN(value.getTime()) ? null : new Date(value.getTime());
	}
	const str = String(value).trim();
	if (!str) return null;
	const normalized = str.includes(' ') && !str.includes('T') ? str.replace(' ', 'T') : str;
	const d = new Date(normalized);
	return Number.isNaN(d.getTime()) ? null : d;
}

export function calculateBookingHours(startTime: unknown, endTime: unknown): number {
	const start = parseBookingDate(startTime);
	const end = parseBookingDate(endTime);
	if (!start || !end) return 0;
	const diffMs = end.getTime() - start.getTime();
	if (diffMs <= 0) return 0;
	return diffMs / (1000 * 60 * 60);
}

export function getBookingTimeRangeBounds(
	range: BookingTimeRange = 'all',
	now: Date = new Date()
): { start: Date | null; end: Date | null } {
	const ref = parseBookingDate(now) ?? new Date();
	const y = ref.getFullYear();
	const m = ref.getMonth();
	const d = ref.getDate();

	switch (range) {
		case 'today':
			return {
				start: new Date(y, m, d, 0, 0, 0, 0),
				end: new Date(y, m, d, 23, 59, 59, 999)
			};
		case '7d':
			return {
				start: new Date(y, m, d - 6, 0, 0, 0, 0),
				end: new Date(y, m, d, 23, 59, 59, 999)
			};
		case 'month':
			return {
				start: new Date(y, m, 1, 0, 0, 0, 0),
				end: new Date(y, m + 1, 0, 23, 59, 59, 999)
			};
		case 'year':
			return {
				start: new Date(y, 0, 1, 0, 0, 0, 0),
				end: new Date(y, 11, 31, 23, 59, 59, 999)
			};
		case 'all':
		default:
			return { start: null, end: null };
	}
}

export function getBookingTimestamp(booking: StatsBookingInput): Date | null {
	if (!booking || typeof booking !== 'object') return null;
	return parseBookingDate(booking.start_time) ?? parseBookingDate(booking.created);
}

export function filterBookingsByTimeRange<T extends StatsBookingInput>(
	bookings: T[] = [],
	range: BookingTimeRange = 'all',
	now: Date = new Date()
): T[] {
	if (!Array.isArray(bookings)) return [];
	if (!range || range === 'all') return [...bookings];
	const { start, end } = getBookingTimeRangeBounds(range, now);
	if (!start || !end) return [...bookings];
	const startMs = start.getTime();
	const endMs = end.getTime();

	return bookings.filter((b) => {
		const dt = getBookingTimestamp(b);
		if (!dt) return false;
		const ms = dt.getTime();
		return ms >= startMs && ms <= endMs;
	});
}

export function isBookingUpcoming(booking: StatsBookingInput, now: Date = new Date()): boolean {
	if (!booking || booking.status === 'cancelled') return false;
	const start = parseBookingDate(booking.start_time);
	if (!start) return false;
	const ref = parseBookingDate(now) ?? new Date();
	return start.getTime() >= ref.getTime();
}

export function filterBookingsByDrilldown<T extends StatsBookingInput>(
	bookings: T[] = [],
	filter: BookingDrilldownFilter = 'all',
	now: Date = new Date()
): T[] {
	if (!Array.isArray(bookings)) return [];
	if (!filter || filter === 'all') return [...bookings];
	if (filter === 'active') {
		return bookings.filter((b) => b.status !== 'cancelled');
	}
	if (filter === 'upcoming') {
		return bookings.filter((b) => isBookingUpcoming(b, now));
	}
	if (filter === 'cancelled') {
		return bookings.filter((b) => b.status === 'cancelled');
	}
	if (filter.startsWith('room:')) {
		const roomTarget = filter.slice(5);
		return bookings.filter((b) => b.field === roomTarget || b.roomName === roomTarget);
	}
	return [...bookings];
}

export function computePeakHourSlot(bookings: StatsBookingInput[] = []): PeakHourInfo | null {
	if (!Array.isArray(bookings) || bookings.length === 0) return null;
	const hourCounts = new Array<number>(24).fill(0);
	let hasAny = false;

	for (const b of bookings) {
		if (!b || b.status === 'cancelled') continue;
		const start = parseBookingDate(b.start_time);
		if (!start) continue;
		const end = parseBookingDate(b.end_time);

		const startHour = start.getHours();
		if (!end || end.getTime() <= start.getTime()) {
			hourCounts[startHour] += 1;
			hasAny = true;
			continue;
		}

		// Count each hour slot overlapped by [start, end) on the same day or capped at 24h
		const durationHours = Math.min(24, Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60))));
		for (let i = 0; i < durationHours; i++) {
			const h = (startHour + i) % 24;
			hourCounts[h] += 1;
			hasAny = true;
		}
	}

	if (!hasAny) return null;

	let bestHour = 0;
	let bestCount = 0;
	for (let h = 0; h < 24; h++) {
		if (hourCounts[h] > bestCount) {
			bestCount = hourCounts[h];
			bestHour = h;
		}
	}

	if (bestCount === 0) return null;
	const nextHour = (bestHour + 1) % 24;
	const slot = `${String(bestHour).padStart(2, '0')}:00 - ${String(nextHour).padStart(2, '0')}:00 น.`;
	return { hour: bestHour, slot, count: bestCount };
}

function formatDateKey(date: Date): string {
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, '0');
	const d = String(date.getDate()).padStart(2, '0');
	return `${y}-${m}-${d}`;
}

function formatMonthKey(date: Date): string {
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, '0');
	return `${y}-${m}`;
}

export function computeBookingTrend(
	bookings: StatsBookingInput[] = [],
	range: BookingTimeRange = 'all',
	now: Date = new Date()
): BookingTrendBucket[] {
	const ref = parseBookingDate(now) ?? new Date();
	const safeBookings = Array.isArray(bookings) ? bookings : [];

	const accumulate = (bucket: BookingTrendBucket, booking: StatsBookingInput) => {
		bucket.count += 1;
		if (booking.status === 'cancelled') {
			bucket.cancelledCount += 1;
		} else {
			bucket.activeCount += 1;
			const hrs = calculateBookingHours(booking.start_time, booking.end_time);
			bucket.hours = Math.round((bucket.hours + hrs) * 10) / 10;
		}
	};

	if (range === 'today' || range === '7d') {
		const days = range === 'today' ? 1 : 7;
		const buckets: BookingTrendBucket[] = [];
		const map = new Map<string, BookingTrendBucket>();
		for (let i = days - 1; i >= 0; i--) {
			const dt = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() - i);
			const key = formatDateKey(dt);
			const label = `${dt.getDate()} ${THAI_SHORT_MONTHS[dt.getMonth()]}`;
			const bucket: BookingTrendBucket = { key, label, count: 0, activeCount: 0, cancelledCount: 0, hours: 0 };
			buckets.push(bucket);
			map.set(key, bucket);
		}
		for (const b of safeBookings) {
			const dt = getBookingTimestamp(b);
			if (!dt) continue;
			const bucket = map.get(formatDateKey(dt));
			if (bucket) accumulate(bucket, b);
		}
		return buckets;
	}

	if (range === 'month') {
		const y = ref.getFullYear();
		const m = ref.getMonth();
		const daysInMonth = new Date(y, m + 1, 0).getDate();
		const buckets: BookingTrendBucket[] = [];
		const map = new Map<string, BookingTrendBucket>();
		for (let day = 1; day <= daysInMonth; day++) {
			const dt = new Date(y, m, day);
			const key = formatDateKey(dt);
			const bucket: BookingTrendBucket = { key, label: `${day}`, count: 0, activeCount: 0, cancelledCount: 0, hours: 0 };
			buckets.push(bucket);
			map.set(key, bucket);
		}
		for (const b of safeBookings) {
			const dt = getBookingTimestamp(b);
			if (!dt) continue;
			const bucket = map.get(formatDateKey(dt));
			if (bucket) accumulate(bucket, b);
		}
		return buckets;
	}

	if (range === 'year') {
		const y = ref.getFullYear();
		const buckets: BookingTrendBucket[] = [];
		const map = new Map<string, BookingTrendBucket>();
		for (let m = 0; m < 12; m++) {
			const dt = new Date(y, m, 1);
			const key = formatMonthKey(dt);
			const bucket: BookingTrendBucket = { key, label: THAI_SHORT_MONTHS[m], count: 0, activeCount: 0, cancelledCount: 0, hours: 0 };
			buckets.push(bucket);
			map.set(key, bucket);
		}
		for (const b of safeBookings) {
			const dt = getBookingTimestamp(b);
			if (!dt) continue;
			const bucket = map.get(formatMonthKey(dt));
			if (bucket) accumulate(bucket, b);
		}
		return buckets;
	}

	// 'all': last 6 months up to `now`
	const buckets: BookingTrendBucket[] = [];
	const map = new Map<string, BookingTrendBucket>();
	for (let i = 5; i >= 0; i--) {
		const dt = new Date(ref.getFullYear(), ref.getMonth() - i, 1);
		const key = formatMonthKey(dt);
		const label = `${THAI_SHORT_MONTHS[dt.getMonth()]} ${String(dt.getFullYear() + 543).slice(-2)}`;
		const bucket: BookingTrendBucket = { key, label, count: 0, activeCount: 0, cancelledCount: 0, hours: 0 };
		buckets.push(bucket);
		map.set(key, bucket);
	}
	for (const b of safeBookings) {
		const dt = getBookingTimestamp(b);
		if (!dt) continue;
		const bucket = map.get(formatMonthKey(dt));
		if (bucket) accumulate(bucket, b);
	}
	return buckets;
}

export function computeBookingStats({
	rooms = [],
	bookings = [],
	range = 'all',
	now = new Date()
}: {
	rooms?: StatsRoomInput[];
	bookings?: StatsBookingInput[];
	range?: BookingTimeRange;
	now?: Date;
} = {}): ComputedBookingStats {
	const safeRooms = Array.isArray(rooms) ? rooms : [];
	const safeBookings = Array.isArray(bookings) ? bookings : [];
	const ref = parseBookingDate(now) ?? new Date();

	const filtered = filterBookingsByTimeRange(safeBookings, range, ref);
	const activeBookings = filtered.filter((b) => b && b.status !== 'cancelled');
	const cancelledBookings = filtered.filter((b) => b && b.status === 'cancelled');
	const upcomingBookings = activeBookings.filter((b) => isBookingUpcoming(b, ref));

	const currentMonthPrefix = `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, '0')}`;
	const monthBookings = safeBookings.filter(
		(b) => b && b.status !== 'cancelled' && String(b.start_time ?? '').startsWith(currentMonthPrefix)
	);

	const bookers = new Set(
		activeBookings
			.map((b) => String(b.bookerEmail ?? b.booker_email ?? b.bookerName ?? '').trim().toLowerCase())
			.filter(Boolean)
	);

	let rawTotalHours = 0;
	for (const b of activeBookings) {
		rawTotalHours += calculateBookingHours(b.start_time, b.end_time);
	}
	const totalHours = Math.round(rawTotalHours * 10) / 10;

	const cancellationRate =
		filtered.length > 0 ? Math.round((cancelledBookings.length / filtered.length) * 1000) / 10 : 0;

	const roomMap = new Map(safeRooms.map((r) => [r.id, r.name]));
	const roomUsage = new Map<string, { id: string; name: string; count: number; hours: number }>();

	for (const b of activeBookings) {
		const roomId = String(b.field ?? b.roomName ?? '').trim();
		if (!roomId) continue;
		const name = roomMap.get(roomId) ?? b.roomName ?? roomId;
		const existing = roomUsage.get(roomId) ?? { id: roomId, name, count: 0, hours: 0 };
		existing.count += 1;
		existing.hours = Math.round((existing.hours + calculateBookingHours(b.start_time, b.end_time)) * 10) / 10;
		roomUsage.set(roomId, existing);
	}

	const sortedRooms = [...roomUsage.values()].sort(
		(a, b) => b.count - a.count || b.hours - a.hours || a.name.localeCompare(b.name, 'th')
	);
	const mostBookedRoom = sortedRooms[0] ?? null;
	const peakHour = computePeakHourSlot(activeBookings);
	const trend = computeBookingTrend(filtered, range, ref);

	return {
		range,
		totalBookings: filtered.length,
		total: activeBookings.length,
		active: activeBookings.length,
		upcoming: upcomingBookings.length,
		month: monthBookings.length,
		cancelled: cancelledBookings.length,
		bookers: bookers.size,
		rooms: safeRooms.length,
		totalHours,
		cancellationRate,
		peakHour,
		mostBookedRoom,
		topRoom: mostBookedRoom?.name ?? '',
		trend,
		generatedAt: ref.toISOString()
	};
}
