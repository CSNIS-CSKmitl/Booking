import { json } from '@sveltejs/kit';
import { createHash } from 'node:crypto';
import PocketBase from 'pocketbase';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

const site = 'booking';
const pbUrl = env.POCKETBASE_URL ?? env.PUBLIC_POCKETBASE_URL ?? '';
async function client() { const pb = new PocketBase(pbUrl); if (env.PB_ADMIN_EMAIL && env.PB_ADMIN_PASSWORD) await pb.admins.authWithPassword(env.PB_ADMIN_EMAIL, env.PB_ADMIN_PASSWORD); return pb; }
export const GET: RequestHandler = async () => { try { const pb = await client(); const items = await pb.collection('announcements').getFullList({ filter: 'status = "published"', sort: '-updated', fields: 'id,title,body,priority,revision,link_label,link_url,source_url,start_at,end_at,targets' }); return json({ items: items.filter((x: any) => !x.targets?.length || x.targets.includes('all') || x.targets.includes(site)), configured: true }, { headers: { 'cache-control': 'no-store' } }); } catch { return json({ items: [], configured: false }); } };
export const POST: RequestHandler = async (event) => { try { const p = await event.request.json(); const announcement = String(p.announcement || p.id || '').trim(); if (!/^[a-zA-Z0-9_-]{1,32}$/.test(announcement)) return json({ ok: true, recorded: false }); const user = event.locals.user?.id; const ip = event.getClientAddress(); const viewer_hash = createHash('sha256').update(`${user || ip}:${event.request.headers.get('user-agent') || 'unknown'}`).digest('hex'); const pb = await client(); await pb.collection('announcement_reads').create({ announcement, revision: String(p.revision || 'default').slice(0, 100), site, ...(user ? { user } : {}), viewer_hash }); return json({ ok: true, recorded: true }); } catch { return json({ ok: true, recorded: false }); } };
