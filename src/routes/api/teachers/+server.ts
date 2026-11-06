import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import PocketBase from 'pocketbase';
import { env } from '$env/dynamic/private';
import { getUserRoles } from '$lib/roles';

export const GET: RequestHandler = async () => {
    try {
        const pbUrl = env.POCKETBASE_URL ?? env.PUBLIC_POCKETBASE_URL ?? 'http://192.168.15.14:8080';
        const pb = new PocketBase(pbUrl);
        pb.autoCancellation(false);
        if (env.PB_ADMIN_EMAIL && env.PB_ADMIN_PASSWORD) {
            await pb.admins.authWithPassword(env.PB_ADMIN_EMAIL, env.PB_ADMIN_PASSWORD);
        }
        const records = await pb.collection('users').getFullList({
            sort: 'name',
            expand: 'user_type',
            requestKey: null
        });
        const teachers = records
            .filter((u: any) => {
                const roles = getUserRoles(u);
                return roles.includes('teachers') || roles.includes('teacher');
            })
            .map((u: any) => ({
                id: u.id,
                name: u.name || u.username || u.email,
                email: u.email || ''
            }));

        return json(teachers);
    } catch (err: any) {
        console.error('[api/teachers] failed:', err?.message ?? err);
        return json([], { status: 500 });
    }
};
