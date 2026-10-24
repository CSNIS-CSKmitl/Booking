import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import PocketBase from 'pocketbase';
import { env } from '$env/dynamic/private';

const PB_URL = env.POCKETBASE_URL ?? env.PUBLIC_POCKETBASE_URL ?? '';
const PB_ADMIN_EMAIL = env.PB_ADMIN_EMAIL || '';
const PB_ADMIN_PASSWORD = env.PB_ADMIN_PASSWORD || '';

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
    if (!locals.user) throw error(401, 'กรุณาเข้าสู่ระบบก่อนทำการแก้ไข');

    const bookingId = params.bookingId;
    if (!bookingId) throw error(400, 'Invalid bookingId');

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') throw error(400, 'Invalid request body');

    const pb = new PocketBase(PB_URL);
    pb.autoCancellation(false);

    try {
        await pb.admins.authWithPassword(PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD);
        
        // 1. Fetch current booking details
        const booking = await pb.collection('bookings').getOne(bookingId);
        
        // 2. Validate permissions: must be superadmin or the original booker
        const isAdmin = locals.user.user_type === '000000000000009' || locals.user.email === PB_ADMIN_EMAIL;
        const isOwner = booking.booker_id === locals.user.id || booking.bookerEmail === locals.user.email;
        if (!isAdmin && !isOwner) {
            throw error(403, 'ไม่มีสิทธิ์แก้ไขรายการจองนี้');
        }

        // 3. Perform updates
        const updates: Record<string, any> = {};
        if (body.title !== undefined) updates.title = String(body.title).trim();
        if (body.detailLabel !== undefined) updates.detailLabel = String(body.detailLabel).trim();
        
        if (body.bookerName !== undefined) {
            if (!isAdmin) throw error(403, 'เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถแก้ไขชื่อผู้จองได้');
            updates.bookerName = String(body.bookerName).trim();
        }

        const updated = await pb.collection('bookings').update(bookingId, { ...updates, updated_by: locals.user.id });
        return json({ success: true, booking: updated });
    } catch (err: any) {
        console.error('PATCH Booking Error:', err);
        throw error(err.status || 500, err.message || 'ไม่สามารถแก้ไขข้อมูลการจองได้');
    } finally {
        pb.authStore.clear();
    }
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
    if (!locals.user) throw error(401, 'กรุณาเข้าสู่ระบบก่อนทำการยกเลิก');

    const bookingId = params.bookingId;
    if (!bookingId) throw error(400, 'Invalid bookingId');

    const pb = new PocketBase(PB_URL);
    pb.autoCancellation(false);

    try {
        await pb.admins.authWithPassword(PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD);
        
        // 1. Fetch booking details
        const booking = await pb.collection('bookings').getOne(bookingId);
        
        // 2. Validate permissions: must be superadmin or the original booker
        const isAdmin = locals.user.user_type === '000000000000009' || locals.user.email === PB_ADMIN_EMAIL;
        const isOwner = booking.booker_id === locals.user.id || booking.bookerEmail === locals.user.email;
        if (!isAdmin && !isOwner) {
            throw error(403, 'ไม่มีสิทธิ์ยกเลิกรายการจองนี้');
        }

        // 3. Update status to 'cancelled' to release slot and retain history
        const updated = await pb.collection('bookings').update(bookingId, { status: 'cancelled', updated_by: locals.user.id });
        return json({ success: true, booking: updated });
    } catch (err: any) {
        console.error('DELETE Booking Error:', err);
        throw error(err.status || 500, err.message || 'ไม่สามารถยกเลิกการจองได้');
    } finally {
        pb.authStore.clear();
    }
};
