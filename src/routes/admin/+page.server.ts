import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import PocketBase from 'pocketbase';
import { env } from '$env/dynamic/private';
import { computeBookingStats } from '$lib/booking-stats';

const SUPERADMIN = '000000000000009';

async function adminClient() {
	const url = env.POCKETBASE_URL ?? env.PUBLIC_POCKETBASE_URL ?? '';
	if (!url || !env.PB_ADMIN_EMAIL || !env.PB_ADMIN_PASSWORD)
		throw error(500, 'ระบบยังไม่ได้ตั้งค่า PocketBase สำหรับ Admin');
	const pb = new PocketBase(url);
	pb.autoCancellation(false);
	await pb.admins.authWithPassword(env.PB_ADMIN_EMAIL, env.PB_ADMIN_PASSWORD);
	return pb;
}

function requireSuperadmin(user: App.Locals['user']) {
	if (!user) throw redirect(303, '/login?redirect=%2Fadmin');
	if (user.user_type !== SUPERADMIN && user.email !== env.PB_ADMIN_EMAIL)
		throw error(403, 'หน้านี้สำหรับ Superadmin เท่านั้น');
}

export const load: PageServerLoad = async ({ locals }) => {
	requireSuperadmin(locals.user);
	let pb: PocketBase | null = null;
	try {
		pb = await adminClient();
		const [rooms, bookings] = await Promise.all([
			pb.collection('rooms').getFullList({ sort: 'name' }),
			pb.collection('bookings').getFullList({ sort: '-start_time', expand: 'field,created_by,updated_by,approved_by', batch: 500 })
		]);
		const roomMap = new Map(rooms.map((r) => [r.id, r]));
		const mappedRooms = rooms.map((r) => ({
			id: r.id,
			name: r.name,
			location: r.location ?? ''
		}));
		const mappedBookings = bookings.map((b) => ({
			id: b.id,
			title: b.title ?? 'ไม่ระบุหัวข้อ',
			field: b.field,
			roomName: roomMap.get(b.field)?.name ?? 'ไม่พบห้อง',
			location: roomMap.get(b.field)?.location ?? '',
			start_time: b.start_time,
			end_time: b.end_time,
			created: b.created ?? '',
			status: b.status,
			bookerName: b.bookerName ?? '',
			bookerEmail: b.bookerEmail ?? '',
			detailLabel: b.detailLabel ?? '',
			advisorName: b.advisorName ?? '',
			createdBy: b.expand?.created_by?.name ?? b.expand?.created_by?.email ?? b.created_by ?? '',
			updatedBy: b.expand?.updated_by?.name ?? b.expand?.updated_by?.email ?? b.updated_by ?? '',
			approvedBy: b.expand?.approved_by?.name ?? b.expand?.approved_by?.email ?? b.approved_by ?? '',
			approvedAt: b.approved_at ?? ''
		}));
		const stats = computeBookingStats({
			rooms: mappedRooms,
			bookings: mappedBookings,
			range: 'all',
			now: new Date()
		});
		return {
			rooms: mappedRooms,
			bookings: mappedBookings,
			stats,
			topRoom: stats.topRoom,
			statsError: '',
			lastUpdated: stats.generatedAt
		};
	} catch (cause) {
		console.error('admin load stats failed', cause);
		const emptyStats = computeBookingStats({ rooms: [], bookings: [], range: 'all', now: new Date() });
		return {
			rooms: [],
			bookings: [],
			stats: emptyStats,
			topRoom: '',
			statsError: 'ไม่สามารถโหลดข้อมูลสถิติจากฐานข้อมูลได้ กรุณากดรีเฟรชเพื่อลองใหม่',
			lastUpdated: ''
		};
	} finally {
		pb?.authStore.clear();
	}
};

export const actions: Actions = {
	createRoom: async ({ request, locals }) => {
		requireSuperadmin(locals.user);
		const form = await request.formData();
		const name = String(form.get('name') ?? '').trim();
		const location = String(form.get('location') ?? '').trim();
		if (!name) return fail(400, { message: 'กรุณาระบุชื่อห้อง' });
		if (name.length > 120 || location.length > 160)
			return fail(400, { message: 'ชื่อห้องหรือสถานที่ยาวเกินกำหนด' });
		const pb = await adminClient();
		try {
			const rooms = await pb.collection('rooms').getFullList({ fields: 'id,name' });
			if (
				rooms.some(
					(room) => String(room.name ?? '').trim().toLocaleLowerCase() === name.toLocaleLowerCase()
				)
			) {
				return fail(409, { message: 'มีห้องชื่อนี้อยู่แล้ว' });
			}
			await pb.collection('rooms').create({ name, location, created_by: locals.user!.id, updated_by: locals.user!.id });
			return { ok: true, message: 'เพิ่มห้องเรียบร้อยแล้ว' };
		} catch (cause) {
			console.error('admin create room failed', cause);
			return fail(400, { message: 'เพิ่มห้องไม่สำเร็จ กรุณาตรวจสอบข้อมูลและสิทธิ์ PocketBase' });
		} finally {
			pb.authStore.clear();
		}
	},
	cancel: async ({ request, locals }) => {
		requireSuperadmin(locals.user);
		const id = String((await request.formData()).get('bookingId') ?? '');
		if (!/^[a-zA-Z0-9_-]{1,64}$/.test(id)) return fail(400, { message: 'รหัสการจองไม่ถูกต้อง' });
		const pb = await adminClient();
		try {
			await pb.collection('bookings').update(id, { status: 'cancelled', updated_by: locals.user!.id });
			return { ok: true };
		} catch {
			return fail(400, { message: 'ยกเลิกการจองไม่สำเร็จ' });
		} finally {
			pb.authStore.clear();
		}
	}
};
