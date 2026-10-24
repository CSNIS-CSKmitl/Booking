import type { LayoutServerLoad } from './$types';
import { env } from '$env/dynamic/private';

export const trailingSlash = 'ignore';

export const load: LayoutServerLoad = async ({ locals }) => {
    const isAdmin = locals.user && (
        locals.user.user_type === '000000000000009' ||
        locals.user.email === env.PB_ADMIN_EMAIL
    );
    return {
        user: locals.user ? { ...locals.user, isAdmin } : null,
    };
};
