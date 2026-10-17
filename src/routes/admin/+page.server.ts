import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import PocketBase from 'pocketbase';
import { env } from '$env/dynamic/private';

const SUPERADMIN = '000000000000009';

async function adminClient() {
	const url = env.POCKETBASE_URL ?? env.PUBLIC_POCKETBASE_URL ?? '';
	if (!url || !env.PB_ADMIN_EMAIL || !env.PB_ADMIN_PASSWORD) throw error(500, 'ระบบยังไม่ได้ตั้งค่า PocketBase สำหรับ Admin');
	const pb = new PocketBase(url);
	pb.autoCancellation(false);
	await pb.admins.authWithPassword(env.PB_ADMIN_EMAIL, env.PB_ADMIN_PASSWORD);
	return pb;
}

function requireSuperadmin(user: App.Locals['user']) {
	if (!user) throw redirect(303, '/login?redirect=%2Fadmin');
	if (user.user_type !== SUPERADMIN && user.email !== env.PB_ADMIN_EMAIL) throw error(403, 'หน้านี้สำหรับ Superadmin เท่านั้น');
}

export const load: PageServerLoad = async ({ locals }) => {
	requireSuperadmin(locals.user);
	const pb = await adminClient();
	try {
		const [rooms, bookings] = await Promise.all([
			pb.collection('rooms').getFullList({ sort: 'name' }),
			pb.collection('bookings').getFullList({ sort: '-start_time', expand: 'field', batch: 500 })
		]);
		const now = new Date();
		const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
		const active = bookings.filter((b) => b.status !== 'cancelled');
		const monthBookings = active.filter((b) => String(b.start_time ?? '').startsWith(month));
		const roomMap = new Map(rooms.map((r) => [r.id, r]));
		const roomCounts = new Map<string, number>();
		for (const b of active) roomCounts.set(b.field, (roomCounts.get(b.field) ?? 0) + 1);
		return {
			rooms: rooms.map((r) => ({ id: r.id, name: r.name, location: r.location ?? '' })),
			bookings: bookings.map((b) => ({
				id: b.id, title: b.title ?? 'ไม่ระบุหัวข้อ', field: b.field,
				roomName: roomMap.get(b.field)?.name ?? 'ไม่พบห้อง', location: roomMap.get(b.field)?.location ?? '',
				start_time: b.start_time, end_time: b.end_time, status: b.status,
				bookerName: b.bookerName ?? '', bookerEmail: b.bookerEmail ?? '', detailLabel: b.detailLabel ?? ''
			})),
			stats: { total: active.length, month: monthBookings.length, cancelled: bookings.length - active.length, rooms: rooms.length },
			topRoom: [...roomCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ? roomMap.get([...roomCounts.entries()].sort((a, b) => b[1] - a[1])[0][0])?.name ?? '' : ''
		};
	} finally { pb.authStore.clear(); }
};

export const actions: Actions = {
	cancel: async ({ request, locals }) => {
		requireSuperadmin(locals.user);
		const id = String((await request.formData()).get('bookingId') ?? '');
		if (!/^[a-zA-Z0-9_-]{1,64}$/.test(id)) return fail(400, { message: 'รหัสการจองไม่ถูกต้อง' });
		const pb = await adminClient();
		try { await pb.collection('bookings').update(id, { status: 'cancelled' }); return { ok: true }; }
		catch { return fail(400, { message: 'ยกเลิกการจองไม่สำเร็จ' }); }
		finally { pb.authStore.clear(); }
	}
};
