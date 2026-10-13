<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import Topbar from '$lib/components/Topbar.svelte';
	import { ModeWatcher } from 'mode-watcher';
	import { Toaster } from '$lib/components/ui/sonner';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<ModeWatcher defaultMode="light" />
<Toaster />

<!-- <Topbar /> -->
<div class="flex min-h-screen flex-col">
	<div class="flex-1">{@render children()}</div>
	<footer class="border-t border-border bg-background px-4 py-3 text-center text-[11px] text-muted-foreground">
		<span>© {new Date().getFullYear()} <a href="https://github.com/techasit5415" target="_blank" rel="noopener noreferrer" class="hover:text-foreground hover:underline">Techasit Vanitpattarakul</a></span>
		<nav aria-label="นโยบายและข้อกำหนด" class="mt-1 flex flex-wrap items-center justify-center gap-x-4 gap-y-0">
		  <a href="/privacy" class="inline-flex min-h-7 items-center underline underline-offset-4 hover:text-foreground">นโยบายความเป็นส่วนตัว</a>
		  <a href="/terms" class="inline-flex min-h-7 items-center underline underline-offset-4 hover:text-foreground">ข้อกำหนดการใช้งาน</a>
		</nav>
	</footer>
</div>
