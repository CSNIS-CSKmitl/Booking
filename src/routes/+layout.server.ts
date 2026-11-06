import type { LayoutServerLoad } from './$types';
import { env } from '$env/dynamic/private';
import { isBookingAdmin } from '$lib/roles';

export const trailingSlash = 'ignore';

export const load: LayoutServerLoad = async ({ locals }) => {
    const isAdmin = locals.user ? isBookingAdmin(locals.user, env.PB_ADMIN_EMAIL) : false;
    return {
        user: locals.user ? { ...locals.user, isAdmin } : null,
    };
};
