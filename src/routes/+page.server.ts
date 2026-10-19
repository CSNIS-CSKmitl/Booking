import { redirect } from '@sveltejs/kit';
import PocketBase from 'pocketbase';
import { env } from '$env/dynamic/private';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
    const pbUrl = env.POCKETBASE_URL ?? env.PUBLIC_POCKETBASE_URL ?? 'https://db.cskmitl.com/';
    const pb = new PocketBase(pbUrl);

    try {
        // Fetch the first room (ordered by name)
        const rooms = await pb.collection('rooms').getFullList({
            sort: 'name',
            fields: 'id'
        });

        if (rooms && rooms.length > 0) {
            // Redirect to the first room's dashboard
            throw redirect(302, `/dashboard/${rooms[0].id}`);
        }
    } catch (err) {
        // SvelteKit redirects are thrown as objects, we must let them pass through
        if (err && typeof err === 'object' && 'status' in err && 'location' in err) {
            throw err;
        }
        console.error('[root load] Failed to fetch rooms or redirect:', err);
    }

    // Fallback if no rooms are found or there was an error
    throw redirect(302, '/login');
};
