import { describe, it, expect } from 'vitest';
import {
	BOOKING_TIME_RANGES,
	parseBookingDate,
	calculateBookingHours,
	filterBookingsByTimeRange,
	filterBookingsByDrilldown,
	computePeakHourSlot,
	computeBookingStats
} from './booking-stats';

const NOW = new Date(2026, 9, 17, 12, 0, 0); // Oct 17, 2026 12:00 local

describe('booking-stats', () => {
	it('defines all 5 time ranges', () => {
		expect(BOOKING_TIME_RANGES.map((r) => r.value)).toEqual(['today', '7d', 'month', 'year', 'all']);
	});

	it('parses valid dates and calculates booking hours safely', () => {
		expect(parseBookingDate(null)).toBeNull();
		expect(parseBookingDate('invalid-date')).toBeNull();
		expect(parseBookingDate('2026-10-17 09:00:00.000Z')).toBeInstanceOf(Date);

		expect(
			calculateBookingHours('2026-10-17T09:00:00.000Z', '2026-10-17T11:30:00.000Z')
		).toBe(2.5);
		// End before start or invalid -> 0
		expect(
			calculateBookingHours('2026-10-17T12:00:00.000Z', '2026-10-17T10:00:00.000Z')
		).toBe(0);
		expect(calculateBookingHours('invalid', '2026-10-17T10:00:00.000Z')).toBe(0);
	});

	it('filters bookings by time range (today, 7d, month, year, all)', () => {
		const bookings = [
			{ id: 'b-today', start_time: new Date(2026, 9, 17, 9, 0, 0).toISOString() },
			{ id: 'b-5d', start_time: new Date(2026, 9, 13, 9, 0, 0).toISOString() },
			{ id: 'b-month', start_time: new Date(2026, 9, 2, 9, 0, 0).toISOString() },
			{ id: 'b-year', start_time: new Date(2026, 3, 10, 9, 0, 0).toISOString() },
			{ id: 'b-old', start_time: new Date(2025, 5, 1, 9, 0, 0).toISOString() },
			{ id: 'b-invalid', start_time: 'not-a-date' }
		];

		expect(filterBookingsByTimeRange(bookings, 'today', NOW).map((b) => b.id)).toEqual(['b-today']);
		expect(filterBookingsByTimeRange(bookings, '7d', NOW).map((b) => b.id)).toEqual([
			'b-today',
			'b-5d'
		]);
		expect(filterBookingsByTimeRange(bookings, 'month', NOW).map((b) => b.id)).toEqual([
			'b-today',
			'b-5d',
			'b-month'
		]);
		expect(filterBookingsByTimeRange(bookings, 'year', NOW).map((b) => b.id)).toEqual([
			'b-today',
			'b-5d',
			'b-month',
			'b-year'
		]);
		expect(filterBookingsByTimeRange(bookings, 'all', NOW)).toHaveLength(6);
	});

	it('filters bookings by drill-down status and room', () => {
		const bookings = [
			{
				id: '1',
				field: 'r1',
				roomName: 'Lab 1',
				status: 'confirmed',
				start_time: new Date(2026, 9, 16, 9, 0, 0).toISOString()
			},
			{
				id: '2',
				field: 'r2',
				roomName: 'Lab 2',
				status: 'approved',
				start_time: new Date(2026, 9, 18, 9, 0, 0).toISOString()
			},
			{
				id: '3',
				field: 'r1',
				roomName: 'Lab 1',
				status: 'cancelled',
				start_time: new Date(2026, 9, 19, 9, 0, 0).toISOString()
			}
		];

		expect(filterBookingsByDrilldown(bookings, 'active', NOW).map((b) => b.id)).toEqual(['1', '2']);
		expect(filterBookingsByDrilldown(bookings, 'upcoming', NOW).map((b) => b.id)).toEqual(['2']);
		expect(filterBookingsByDrilldown(bookings, 'cancelled', NOW).map((b) => b.id)).toEqual(['3']);
		expect(filterBookingsByDrilldown(bookings, 'room:r1', NOW).map((b) => b.id)).toEqual([
			'1',
			'3'
		]);
		expect(filterBookingsByDrilldown(bookings, 'all', NOW)).toHaveLength(3);
	});

	it('handles empty state in computeBookingStats without NaN or errors', () => {
		const stats = computeBookingStats({ rooms: [], bookings: [], range: 'all', now: NOW });
		expect(stats.totalBookings).toBe(0);
		expect(stats.total).toBe(0);
		expect(stats.upcoming).toBe(0);
		expect(stats.cancelled).toBe(0);
		expect(stats.totalHours).toBe(0);
		expect(stats.cancellationRate).toBe(0);
		expect(stats.peakHour).toBeNull();
		expect(stats.mostBookedRoom).toBeNull();
		expect(stats.topRoom).toBe('');
		expect(stats.trend).toHaveLength(6);
	});

	it('computes total usage hours, peak hour, cancellation rate, and most booked room accurately', () => {
		const rooms = [
			{ id: 'room-a', name: 'Lab 101' },
			{ id: 'room-b', name: 'Seminar 202' }
		];
		const bookings = [
			{
				id: 'b1',
				field: 'room-a',
				status: 'confirmed',
				bookerEmail: 'alice@kmitl.ac.th',
				start_time: new Date(2026, 9, 17, 9, 0, 0).toISOString(),
				end_time: new Date(2026, 9, 17, 11, 0, 0).toISOString() // 2h (09:00-11:00)
			},
			{
				id: 'b2',
				field: 'room-a',
				status: 'approved',
				bookerEmail: 'bob@kmitl.ac.th',
				start_time: new Date(2026, 9, 17, 10, 0, 0).toISOString(),
				end_time: new Date(2026, 9, 17, 12, 0, 0).toISOString() // 2h (10:00-12:00) -> 10:00 overlaps!
			},
			{
				id: 'b3',
				field: 'room-b',
				status: 'confirmed',
				bookerEmail: 'alice@kmitl.ac.th',
				start_time: new Date(2026, 9, 18, 13, 0, 0).toISOString(),
				end_time: new Date(2026, 9, 18, 14, 30, 0).toISOString() // 1.5h, upcoming
			},
			{
				id: 'b4',
				field: 'room-b',
				status: 'cancelled',
				bookerEmail: 'charlie@kmitl.ac.th',
				start_time: new Date(2026, 9, 17, 10, 0, 0).toISOString(),
				end_time: new Date(2026, 9, 17, 12, 0, 0).toISOString() // cancelled -> excluded from hours & peak
			}
		];

		const stats = computeBookingStats({ rooms, bookings, range: 'month', now: NOW });
		expect(stats.totalBookings).toBe(4);
		expect(stats.total).toBe(3);
		expect(stats.upcoming).toBe(1);
		expect(stats.cancelled).toBe(1);
		expect(stats.bookers).toBe(2);
		expect(stats.rooms).toBe(2);
		expect(stats.totalHours).toBe(5.5);
		expect(stats.cancellationRate).toBe(25);
		expect(stats.peakHour).toEqual({
			hour: 10,
			slot: '10:00 - 11:00 น.',
			count: 2
		});
		expect(stats.mostBookedRoom).toEqual({
			id: 'room-a',
			name: 'Lab 101',
			count: 2,
			hours: 4
		});
		expect(stats.topRoom).toBe('Lab 101');
	});
});
