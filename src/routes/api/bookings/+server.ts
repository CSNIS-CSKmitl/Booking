import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import PocketBase from 'pocketbase';
import { env } from '$env/dynamic/private';
import { writeChangeAudit } from '$lib/server/audit-log';

const PB_URL = env.POCKETBASE_URL ?? env.PUBLIC_POCKETBASE_URL ?? '';
// ✅ เปลี่ยนมาดึงรหัสผ่านแอดมินตรงเพื่อไขระบบ Admin ตัวเก่าแทนเหรียญ Token ดิบ
const PB_ADMIN_EMAIL = env.PB_ADMIN_EMAIL || '';
const PB_ADMIN_PASSWORD = env.PB_ADMIN_PASSWORD || '';

// === Validation helpers ===
const SAFE_ID = /^[a-zA-Z0-9_-]{1,64}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

function isValidRoomId(s: string): boolean {
    return typeof s === 'string' && SAFE_ID.test(s);
}
function isValidDate(s: string): boolean {
    return typeof s === 'string' && DATE.test(s);
}
function isValidTime(s: string): boolean {
    return typeof s === 'string' && TIME.test(s);
}

type CreateBookingBody = {
    roomId: string;
    date: string;
    startTime: string;  // HH:MM
    endTime: string;    // HH:MM
    title: string;
    notes?: string;
    isRecurring?: boolean;
    recurringUntil?: string; // YYYY-MM-DD
    recurringDays?: number[];
    customBookerName?: string;
};

function validateBody(b: any): { ok: true; data: CreateBookingBody } | { ok: false; error: string } {
    if (!b || typeof b !== 'object') return { ok: false, error: 'Invalid body' };
    const { roomId, date, startTime, endTime, title, notes, isRecurring, recurringUntil, recurringDays, customBookerName } = b;

    if (!isValidRoomId(roomId)) return { ok: false, error: 'Invalid roomId' };
    if (!isValidDate(date)) return { ok: false, error: 'Invalid date' };
    if (!isValidTime(startTime) || !isValidTime(endTime)) {
        return { ok: false, error: 'Invalid time format' };
    }
    if (startTime >= endTime) {
        return { ok: false, error: 'เวลาเริ่มต้องน้อยกว่าเวลาจบ' };
    }
    if (!title || typeof title !== 'string' || !title.trim()) {
        return { ok: false, error: 'กรุณากรอกหัวข้อการจอง' };
    }
    if (title.length > 200) {
        return { ok: false, error: 'หัวข้อยาวเกิน 200 ตัวอักษร' };
    }
    if (notes && typeof notes === 'string' && notes.length > 500) {
        return { ok: false, error: 'รายละเอียดยาวเกิน 500 ตัวอักษร' };
    }
    if (customBookerName && (typeof customBookerName !== 'string' || customBookerName.length > 100)) {
        return { ok: false, error: 'ชื่อผู้จองยาวเกิน 100 ตัวอักษร' };
    }
    if (isRecurring) {
        if (!recurringUntil || !isValidDate(recurringUntil)) {
            return { ok: false, error: 'กรุณาระบุวันที่สิ้นสุดการจองซ้ำให้ถูกต้อง' };
        }
        if (recurringUntil < date) {
            return { ok: false, error: 'วันที่สิ้นสุดการจองซ้ำต้องอยู่หลังวันที่เริ่มต้น' };
        }
        if (recurringDays !== undefined) {
            if (!Array.isArray(recurringDays) || recurringDays.length === 0) {
                return { ok: false, error: 'กรุณาระบุวันในสัปดาห์ที่ต้องการจองซ้ำ' };
            }
            for (const d of recurringDays) {
                if (typeof d !== 'number' || d < 0 || d > 6) {
                    return { ok: false, error: 'วันในสัปดาห์ไม่ถูกต้อง' };
                }
            }
        }
    }

    return {
        ok: true,
        data: {
            roomId,
            date,
            startTime,
            endTime,
            title: title.trim(),
            notes: typeof notes === 'string' ? notes.trim() : '',
            isRecurring: !!isRecurring,
            recurringUntil: recurringUntil || '',
            recurringDays: Array.isArray(recurringDays) ? recurringDays : [],
            customBookerName: customBookerName ? customBookerName.trim() : undefined,
        },
    };
}

export const POST: RequestHandler = async ({ request, locals }) => {
    if (!PB_URL) {
        throw error(500, 'Server configuration error');
    }

    // 🔒 ระบบดักสิทธิ์ขั้นต้น: ต้องผ่านด่านการล็อกอินของสถาบันมาก่อนเสมอ
    if (!locals.user) {
        throw error(401, 'กรุณาเข้าสู่ระบบก่อนทำการจอง');
    }

    // แกะตรวจสอบฟอร์มข้อมูลที่ยิงมาหน้าเบราว์เซอร์
    const body = await request.json().catch(() => null);
    const result = validateBody(body);
    if (!result.ok) {
        throw error(400, result.error);
    }
    const data = result.data;

    // ตรวจสอบสิทธิ์ Superadmin
    const isAdmin = locals.user.user_type === '000000000000009' || locals.user.email === PB_ADMIN_EMAIL;
    if (data.isRecurring && !isAdmin) {
        throw error(403, 'คุณไม่มีสิทธิ์ทำรายการจองซ้ำรายสัปดาห์');
    }

    // ✅ ปรับปรุงโครงสร้างเปิดอินสแตนซ์แยกเดี่ยว ป้องกันสายสัญญาณแชร์ชนกันใน RAM
    const pb = new PocketBase(PB_URL);
    pb.autoCancellation(false);

    try {
        // ✅ ยืนยันตัวตนแอดมินผ่าน admins เพื่อ bypass กฎการเขียน 'Admin only' ของ PocketBase
        await pb.admins.authWithPassword(PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD);
    } catch (adminErr) {
        console.error('❌ พังตรงล็อกอินแอดมินที่ Endpoint:', adminErr);
        throw error(500, 'ระบบภายในไม่สามารถเปิดสิทธิ์ผู้ดูแลเพื่อเขียนจองได้');
    }

    // ตรวจหาห้องประชุม
    try {
        await pb.collection('rooms').getOne(data.roomId);
    } catch {
        throw error(400, 'ไม่พบห้องนี้ในระบบ');
    }

    // สร้างชุดวันที่การจอง
    const dates: string[] = [];
    if (data.isRecurring && data.recurringUntil) {
        const startMs = Date.parse(data.date);
        const untilMs = Date.parse(data.recurringUntil);
        if (Number.isNaN(startMs) || Number.isNaN(untilMs) || untilMs < startMs) {
            throw error(400, 'วันที่สิ้นสุดการจองซ้ำไม่ถูกต้อง');
        }
        const maxWeeks = 24;
        const diffWeeks = (untilMs - startMs) / (1000 * 60 * 60 * 24 * 7);
        if (diffWeeks > maxWeeks) {
            throw error(400, `ระบบอนุญาตให้จองซ้ำได้สูงสุดไม่เกิน ${maxWeeks} สัปดาห์`);
        }

        const targetDays = Array.isArray(data.recurringDays) && data.recurringDays.length > 0
            ? data.recurringDays
            : [new Date(`${data.date}T00:00:00`).getDay()];
        
        const current = new Date(`${data.date}T00:00:00`);
        const end = new Date(`${data.recurringUntil}T00:00:00`);
        while (current <= end) {
            const dayOfWeek = current.getDay();
            if (targetDays.includes(dayOfWeek)) {
                const yyyy = current.getFullYear();
                const mm = String(current.getMonth() + 1).padStart(2, '0');
                const dd = String(current.getDate()).padStart(2, '0');
                dates.push(`${yyyy}-${mm}-${dd}`);
            }
            current.setDate(current.getDate() + 1);
        }

        if (dates.length === 0) {
            throw error(400, 'ไม่มีวันที่ตรงกับเงื่อนไขการจองซ้ำในช่วงเวลาที่กำหนด');
        }
    } else {
        dates.push(data.date);
    }

    // ดึงคิวการจองเดิมที่อยู่ในช่วงวันที่เพื่อตรวจสอบการทับซ้อน
    const filter = `field = "${data.roomId}" && date >= "${dates[0]}" && date <= "${dates[dates.length - 1]}" && status != "cancelled"`;
    let existingBookings;
    try {
        existingBookings = await pb.collection('bookings').getFullList({
            filter,
            sort: 'start_time',
        });
    } catch (err) {
        console.error('❌ Failed to fetch existing bookings:', err);
        throw error(500, 'ไม่สามารถตรวจสอบการทับซ้อนเวลาได้');
    }

    // ตรวจหาความขัดแย้ง (Overlap check)
    const conflicts: string[] = [];
    for (const date of dates) {
        const startISO = `${date}T${data.startTime}:00+07:00`;
        const endISO = `${date}T${data.endTime}:00+07:00`;
        const startMs = Date.parse(startISO);
        const endMs = Date.parse(endISO);
        
        const dayBookings = existingBookings.filter(b => b.date === date);
        for (const b of dayBookings) {
            const bsMs = Date.parse(String(b.start_time).replace(' ', 'T'));
            const beMs = Date.parse(String(b.end_time).replace(' ', 'T'));
            if (Number.isNaN(bsMs) || Number.isNaN(beMs)) continue;
            if (startMs < beMs && endMs > bsMs) {
                const formattedDate = new Date(`${date}T00:00:00`).toLocaleDateString('th-TH', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                });
                conflicts.push(`${formattedDate} (ชนการจอง "${b.title}")`);
            }
        }
    }

    if (conflicts.length > 0) {
        const showLimit = 3;
        const listText = conflicts.slice(0, showLimit).join(', ');
        const suffix = conflicts.length > showLimit ? ` และวันอื่น ๆ อีก ${conflicts.length - showLimit} รายการ` : '';
        throw error(409, `ไม่สามารถจองได้เนื่องจากเวลาทับซ้อนในวันที่: ${listText}${suffix}`);
    }

    // รวมข้อมูลรายละเอียดนักศึกษาจริง ๆ ที่ได้แกะผ่านคุกกี้ระบบ
    let bookerName = locals.user.name || locals.user.email;
    if (isAdmin && data.customBookerName) {
        bookerName = data.customBookerName;
    }
    const bookerEmail = locals.user.email;

    const createdBookings = [];
    try {
        // บันทึกแถวข้อมูลลงคลัง PocketBase ทีละวันที่ (แบบ loop ที่สามารถ rollback ได้หากมีบางรายการล้มเหลว)
        for (const date of dates) {
            const startISO = `${date}T${data.startTime}:00+07:00`;
            const endISO = `${date}T${data.endTime}:00+07:00`;
            
            const b = await pb.collection('bookings').create({
                field: data.roomId,
                date: date,
                start_time: startISO,
                end_time: endISO,
                title: data.title,
                bookerName,
                bookerEmail,
                booker_id: locals.user.id,
                detailLabel: data.notes || '',
                status: 'approved',
            });
            createdBookings.push(b);
            await writeChangeAudit({ actorId: locals.user.id, collection: 'bookings', recordId: b.id, action: 'create/status:approved', after: b });
        }
    } catch (err: any) {
        console.error('❌ PocketBase Create Failed:', JSON.stringify(err.data, null, 2));
        // Rollback ล้างรายการที่จองไปแล้วในชุดเดียวกันออกเพื่อความเป็นระเบียบ
        for (const cb of createdBookings) {
            try {
                await pb.collection('bookings').delete(cb.id);
            } catch (delErr) {
                console.error(`Rollback delete failed for ${cb.id}:`, delErr);
            }
        }
        throw error(400, `สร้าง Record ไม่สำเร็จ: ${err.message}`);
    } finally {
        // ✅ เคลียร์สิทธิ์ออกจากหน่วยความจำของคลาสเสมอเพื่อสุขอนามัยของระบบ
        pb.authStore.clear();
    }

    return json({ success: true, booking: createdBookings[0], count: createdBookings.length });
};
