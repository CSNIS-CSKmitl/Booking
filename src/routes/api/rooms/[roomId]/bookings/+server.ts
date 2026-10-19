import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import PocketBase from 'pocketbase';
import { env } from '$env/dynamic/private';

const PB_URL = env.POCKETBASE_URL ?? env.PUBLIC_POCKETBASE_URL ?? '';
const PB_ADMIN_EMAIL = env.PB_ADMIN_EMAIL || '';
const PB_ADMIN_PASSWORD = env.PB_ADMIN_PASSWORD || '';

const SAFE_ID = /^[a-zA-Z0-9_-]{1,64}$/;

function isValidRoomId(s: string | undefined): s is string {
    return typeof s === 'string' && SAFE_ID.test(s);
}

function escapeFilterValue(value: string): string {
    return value.replace(/[\\"'\n\r\t]/g, '\\$&');
}

/**
 * GET /api/rooms/[roomId]/bookings
 *
 * Public endpoint สำหรับ room display (Raspberry Pi kiosk) + dashboard
 * - ไม่ต้อง login (Pi ไม่ auth)
 * - ใช้ admin auth ฝั่ง server
 * - ตัด PII ออก (email, booker_id, KMITL user id) → ส่งแค่ข้อมูลที่ Pi/dashboard ต้องแสดงจริงๆ
 * - filter cancelled ออก
 *
 * Query params:
 *   - date=YYYY-MM-DD  (optional) เฉพาะ booking ที่ทับวันนั้น (Bangkok day)
 *   - from=ISO         (optional) เฉพาะ booking ที่ end_time >= from (default: now)
 *
 * Response: { bookings: Array<{id, title, start_time, end_time, status, detailLabel, field}> }
 */
export const GET: RequestHandler = async ({ params, url }) => {
    const roomId = params.roomId;
    if (!isValidRoomId(roomId)) {
        throw error(400, 'Invalid roomId');
    }
    const safeRoomId = escapeFilterValue(roomId);

    if (!PB_URL || !PB_ADMIN_EMAIL || !PB_ADMIN_PASSWORD) {
        throw error(500, 'Server configuration error');
    }

    const dateFilter = url.searchParams.get('date');
    const fromFilter = url.searchParams.get('from');

    const pb = new PocketBase(PB_URL);
    pb.autoCancellation(false);

    try {
        await pb.admins.authWithPassword(PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD);

        // ✅ ไม่ apply time filter อัตโนมัติ — ให้ client filter เองตาม use case
        //   - room page: ต้องการ "วันนี้" ทั้งหมด (รวมที่จบแล้ว เพื่อโชว์ context)
        //   - dashboard: ต้องการทั้งเดือน (รวมอดีต)
        //   - filter cancelled ออกเท่านั้น (default)
        let filter = `field = "${safeRoomId}" && status != "cancelled"`;
        if (dateFilter) {
            // filter bookings ที่ทับกับวันที่กำหนด (Bangkok day boundary)
            filter += ` && start_time <= "${dateFilter}T23:59:59+07:00" && end_time >= "${dateFilter}T00:00:00+07:00"`;
        } else if (fromFilter) {
            // filter bookings ที่ยังไม่จบหลัง from
            filter += ` && end_time >= "${fromFilter}"`;
        }
        // ถ้าไม่ส่ง date/from → คืนทั้งหมด (client filter เอง)

        const records = await pb.collection('bookings').getFullList({
            filter,
            sort: 'start_time',
        });

        // 🔒 Sanitize: ส่ง bookerName, bookerEmail ให้ระบบแสดงผลรายละเอียดการจอง
        const bookings = records.map((r) => ({
            id: r.id,
            field: r.field,
            title: r.title ?? 'Untitled',
            start_time: r.start_time,
            end_time: r.end_time,
            status: r.status,
            detailLabel: r.detailLabel ?? '',
            bookerName: r.bookerName ?? '',
            bookerEmail: r.bookerEmail ?? '',
        }));

        return json({ bookings });
    } catch (err: any) {
        console.error('[api/rooms/bookings] error:', err?.message ?? err);
        throw error(500, 'Failed to load bookings');
    } finally {
        pb.authStore.clear();
    }
};
