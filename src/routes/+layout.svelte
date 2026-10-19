<script lang="ts">
	import './layout.css';
	import { page } from '$app/state';
	import favicon from '$lib/assets/favicon.svg';
	import Topbar from '$lib/components/Topbar.svelte';
	import { ModeWatcher } from 'mode-watcher';
	import { Toaster } from '$lib/components/ui/sonner';
	import LegalConsent from '$lib/components/LegalConsent.svelte';
	import AnnouncementCenter from '$lib/components/AnnouncementCenter.svelte';
	import type { LayoutData } from './$types';
	import type { Snippet } from 'svelte';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();
	let isLegalPage = $derived(['/privacy', '/terms'].includes(page.url.pathname.replace(/\/$/, '')));
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<ModeWatcher defaultMode="light" />
<Toaster />
{#if !page.url.pathname.startsWith('/dashboard/')}
	<AnnouncementCenter />
{/if}

<!-- <Topbar /> -->
<div class="flex min-h-screen flex-col">
	<div class="flex-1">{@render children()}</div>
	<footer class="border-t border-border bg-background px-4 py-3 text-center text-[11px] text-muted-foreground">
        <span>© {new Date().getFullYear()} · ผู้จัดทำ <a href="https://github.com/techasit5415" target="_blank" rel="noopener noreferrer" class="hover:text-foreground hover:underline">นาย เตชสิทธิ์ วาณิชภัทรกุล</a></span>
		<nav aria-label="นโยบายและข้อกำหนด" class="mt-1 flex flex-wrap items-center justify-center gap-x-4 gap-y-0">
		  <a href="/privacy" class="inline-flex min-h-7 items-center underline underline-offset-4 hover:text-foreground">นโยบายความเป็นส่วนตัว</a>
		  <a href="/terms" class="inline-flex min-h-7 items-center underline underline-offset-4 hover:text-foreground">ข้อกำหนดการใช้งาน</a>
		</nav>
	</footer>
  <LegalConsent userId={data.user?.id ?? null} enabled={!isLegalPage} />
</div>
