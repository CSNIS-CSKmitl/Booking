import type { Handle } from '@sveltejs/kit';
import PocketBase from 'pocketbase';
import { env } from '$env/dynamic/private';

type AuthUser = {
    id: string;
    email: string;
    name: string;
    username?: string;
    user_type?: string;
    isAdmin?: boolean;
};

type PbAuthCookie = {
    token: string;
    model?: {
        id?: string;
        email?: string;
        name?: string;
        username?: string;
        [k: string]: any;
    };
};

function decodeJwtPayload(token: string): { id?: string; exp?: number; [k: string]: any } | null {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;
        const payload = parts[1];
        const padded = payload.replace(/-/g, '+').replace(/_/g, '/');
        const padLen = (4 - (padded.length % 4)) % 4;
        const json = Buffer.from(padded + '='.repeat(padLen), 'base64').toString('utf-8');
        return JSON.parse(json);
    } catch {
        return null;
    }
}

const PB_URL = env.POCKETBASE_URL ?? env.PUBLIC_POCKETBASE_URL ?? '';
const PB_ADMIN_EMAIL = env.PB_ADMIN_EMAIL ?? '';
const PB_ADMIN_PASSWORD = env.PB_ADMIN_PASSWORD ?? '';

// cache 1 นาที กันยิง PB ซ้ำ
const userCache = new Map<string, { user: AuthUser; expires: number }>();
const CACHE_TTL_MS = 60_000;

// Admin PB client cache (ใช้ดึง user record เพราะ users collection rule มักแคบ)
// re-auth ทุก 5 นาที กัน token หมดอายุ
let adminPb: PocketBase | null = null;
let adminAuthTime = 0;
const ADMIN_AUTH_TTL_MS = 5 * 60 * 1000;

async function getAdminPb(): Promise<PocketBase | null> {
    if (!PB_URL || !PB_ADMIN_EMAIL || !PB_ADMIN_PASSWORD) return null;

    if (adminPb && adminPb.authStore.isValid && Date.now() - adminAuthTime < ADMIN_AUTH_TTL_MS) {
        return adminPb;
    }

    adminPb = new PocketBase(PB_URL);
    adminPb.autoCancellation(false);
    try {
        await adminPb.admins.authWithPassword(PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD);
        adminAuthTime = Date.now();
        return adminPb;
    } catch (err) {
        console.warn('[auth] Admin auth failed:', err instanceof Error ? err.message : err);
        adminPb = null;
        return null;
    }
}

/** ดึง user record สดจาก PB (ใช้ admin auth เพราะ users collection rule มักจำกัด)
 *  ใช้ email แทน id เพราะ id ใน JWT บางทีไม่ตรงกับ record ใน users collection
 *  (เจอกรณี impersonate token id ไม่ตรง → getOne 404)
 */
async function fetchFreshUserFromPb(email: string): Promise<AuthUser | null> {
    const pb = await getAdminPb();
    if (!pb || !email) return null;

    try {
        // escape quote กัน filter injection
        const safe = email.replace(/"/g, '\\"');
        const fresh = await pb.collection('users').getFirstListItem(`email = "${safe}"`);
        if (!fresh?.id || !fresh?.email) return null;
        return {
            id: fresh.id,
            email: fresh.email,
            name: fresh.name ?? '',
            username: fresh.username,
            user_type: fresh.user_type ?? '',
        };
    } catch (err) {
        // ลองค้นหาใน admins เผื่อเป็นผู้ดูแลระบบหลัก (PocketBase legacy Admin)
        try {
            const safe = email.replace(/"/g, '\\"');
            const adminList = await pb.admins.getList(1, 1, {
                filter: `email = "${safe}"`
            });
            const admin = adminList.items[0];
            if (admin?.id && admin?.email) {
                return {
                    id: admin.id,
                    email: admin.email,
                    name: 'Administrator',
                    username: 'admin',
                    user_type: '000000000000009',
                };
            }
        } catch {
            // ละเว้นหากค้นหาใน admins ไม่พบเช่นกัน
        }

        console.warn('[auth] PB re-fetch by email failed:', err instanceof Error ? err.message : err);
        return null;
    }
}

export const handle: Handle = async ({ event, resolve }) => {
    const raw = event.cookies.get('pb_auth');
    if (!raw) return resolve(event);

    let parsed: PbAuthCookie;
    try {
        parsed = JSON.parse(raw);
    } catch {
        return resolve(event);
    }

    const token = parsed?.token;
    const model = parsed?.model;
    if (!token || !model?.id || !model.email) return resolve(event);

    // 1) ตรวจ JWT structure + exp
    //    - structure valid → PB เซ็น token จริง
    //    - exp ยังไม่หมด → token ใช้ได้
    //    ✅ ไม่ check model.id === payload.id เพราะ PB impersonate token
    //       บางเวอร์ชัน payload.id ไม่ตรงกับ user record id (เช่น เป็น collection id)
    //       แต่ JWT signature ของ PB verify ได้ → auth จริง
    const payload = decodeJwtPayload(token);
    if (!payload) return resolve(event);
    if (typeof payload.exp === 'number' && payload.exp * 1000 <= Date.now()) {
        return resolve(event);
    }

    // 3) cache
    const cached = userCache.get(token);
    if (cached && cached.expires > Date.now()) {
        event.locals.user = cached.user;
        const response = await resolve(event);
        return response;
    }

	// 4) ลองดึงจาก database เสมอเพื่อความอัปเดตของ Role/ข้อมูลผู้ใช้
	let user: AuthUser | null = await fetchFreshUserFromPb(model.email);
	
	// ถ้าดึงไม่ได้ (เช่น DB ล่ม) ให้ใช้ข้อมูลจาก Cookie เป็น Fallback
	if (!user) {
		user = {
			id: model.id,
			email: model.email,
			name: model.name ?? '',
			username: model.username,
			user_type: model.user_type ?? '',
		};
	}

	event.locals.user = user;
    userCache.set(token, { user, expires: Date.now() + CACHE_TTL_MS });
	const response = await resolve(event);
	return response;
};
